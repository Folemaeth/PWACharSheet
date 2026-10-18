import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HorizontalScrollRow } from '../HorizontalScrollRow';

interface Layout {
  scrollWidth: number;
  clientWidth: number;
  scrollLeft: number;
}

const STUBBED = ['scrollWidth', 'clientWidth', 'scrollLeft', 'scrollBy', 'getBoundingClientRect'] as const;

/** jsdom has no layout: fake scroll metrics on every HTMLElement, clamped like a browser. */
function stubLayout(layout: Layout): Layout {
  const maxScroll = () => Math.max(0, layout.scrollWidth - layout.clientWidth);
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => layout.scrollWidth });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => layout.clientWidth });
  Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
    configurable: true,
    get: () => layout.scrollLeft,
    set: (value: number) => {
      layout.scrollLeft = Math.max(0, Math.min(value, maxScroll()));
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollBy', {
    configurable: true,
    value(options: ScrollToOptions) {
      (this as HTMLElement).scrollLeft += options.left ?? 0;
    },
  });
  return layout;
}

afterEach(() => {
  for (const prop of STUBBED) Reflect.deleteProperty(HTMLElement.prototype, prop);
});

function renderRow(activeKey = 'a') {
  return render(
    <HorizontalScrollRow role="tablist" aria-label="Categories" activeKey={activeKey}>
      {['a', 'b', 'c', 'd'].map((key) => (
        <button key={key} type="button" role="tab" aria-selected={key === activeKey}>
          {key.toUpperCase()}
        </button>
      ))}
    </HorizontalScrollRow>
  );
}

const arrow = (container: HTMLElement, direction: 'left' | 'right') =>
  container.querySelector<HTMLButtonElement>(`button[data-direction="${direction}"]`);

describe('HorizontalScrollRow', () => {
  it('passes props through to the scrolling element', () => {
    renderRow();
    const tablist = screen.getByRole('tablist', { name: 'Categories' });
    expect(tablist).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('shows no arrows when content fits', () => {
    stubLayout({ scrollWidth: 200, clientWidth: 200, scrollLeft: 0 });
    const { container } = renderRow();
    expect(arrow(container, 'left')).toBeNull();
    expect(arrow(container, 'right')).toBeNull();
  });

  it('shows only the arrows for directions that can scroll', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    const { container } = renderRow();
    expect(arrow(container, 'left')).toBeNull();
    expect(arrow(container, 'right')).toBeInTheDocument();

    layout.scrollLeft = 300;
    fireEvent.scroll(screen.getByRole('tablist'));
    expect(arrow(container, 'left')).toBeInTheDocument();
    expect(arrow(container, 'right')).toBeNull();
  });

  it('keeps arrows out of the accessibility tree and focus order', () => {
    stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    const { container } = renderRow();
    const right = arrow(container, 'right');
    expect(right).toHaveAttribute('aria-hidden', 'true');
    expect(right).toHaveAttribute('tabindex', '-1');
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('scrolls horizontally on a vertical mouse wheel', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    renderRow();
    const notPrevented = fireEvent.wheel(screen.getByRole('tablist'), { deltaY: 100 });
    expect(notPrevented).toBe(false);
    expect(layout.scrollLeft).toBe(100);
  });

  it('converts line-mode wheel deltas to pixels', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    renderRow();
    fireEvent.wheel(screen.getByRole('tablist'), { deltaY: 3, deltaMode: 1 });
    expect(layout.scrollLeft).toBe(48);
  });

  it('leaves horizontal-dominant wheel gestures to the browser', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    renderRow();
    const notPrevented = fireEvent.wheel(screen.getByRole('tablist'), { deltaX: 50, deltaY: 10 });
    expect(notPrevented).toBe(true);
    expect(layout.scrollLeft).toBe(0);
  });

  it('lets the wheel through at the end it is scrolling towards', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 300 });
    renderRow();
    const tablist = screen.getByRole('tablist');
    expect(fireEvent.wheel(tablist, { deltaY: 100 })).toBe(true);
    expect(layout.scrollLeft).toBe(300);

    expect(fireEvent.wheel(tablist, { deltaY: -100 })).toBe(false);
    expect(layout.scrollLeft).toBe(200);
  });

  it('does not intercept the wheel when content fits', () => {
    stubLayout({ scrollWidth: 200, clientWidth: 200, scrollLeft: 0 });
    renderRow();
    expect(fireEvent.wheel(screen.getByRole('tablist'), { deltaY: 100 })).toBe(true);
  });

  it('scrolls by most of a page when an arrow is clicked', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    const { container } = renderRow();
    fireEvent.click(arrow(container, 'right')!);
    expect(layout.scrollLeft).toBe(160);

    fireEvent.scroll(screen.getByRole('tablist'));
    fireEvent.click(arrow(container, 'left')!);
    expect(layout.scrollLeft).toBe(0);
  });

  it('scrolls the selected item into view horizontally', () => {
    const layout = stubLayout({ scrollWidth: 500, clientWidth: 200, scrollLeft: 0 });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value(this: HTMLElement) {
        const isSelected = this.getAttribute('aria-selected') === 'true';
        const [left, right] = isSelected ? [300, 380] : [0, 200];
        return { left, right, top: 0, bottom: 40, width: right - left, height: 40, x: left, y: 0 } as DOMRect;
      },
    });
    renderRow('d');
    expect(layout.scrollLeft).toBe(180);
  });
});
