import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HelpPopover } from '../HelpPopover';

/**
 * The help text used across tests. The `concept` key drives the auto-open
 * suppression store; we pre-suppress it so tests start closed and assert the
 * explicit click behaviour (the bug: clicking the "?" did nothing because the
 * popover opened into a clipped, overflow:hidden ancestor).
 */
const CONCEPT = 'test-concept';
const TEXT = 'This is the help text for the concept.';

beforeEach(() => {
  // Suppress auto-open (dismissed >= 3) so the popover starts closed.
  localStorage.clear();
  localStorage.setItem(`wfrp-hint-dismissed-${CONCEPT}`, '3');
});

describe('HelpPopover', () => {
  it('renders a trigger button and no popover initially', () => {
    render(<HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>);
    const trigger = screen.getByRole('button', { name: `Help: ${CONCEPT}` });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens the popover with the help text when the trigger is clicked', () => {
    render(<HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>);
    fireEvent.click(screen.getByRole('button', { name: `Help: ${CONCEPT}` }));

    const popover = screen.getByRole('tooltip');
    expect(popover).toBeInTheDocument();
    expect(popover).toHaveTextContent(TEXT);
    expect(screen.getByRole('button', { name: `Help: ${CONCEPT}` })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('renders the open popover in a portal on document.body (escapes clipping ancestors)', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden' }}>
        <HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: `Help: ${CONCEPT}` }));

    const popover = screen.getByRole('tooltip');
    // The popover is NOT inside the overflow:hidden wrapper — it's portaled to body.
    expect(container.contains(popover)).toBe(false);
    expect(document.body.contains(popover)).toBe(true);
    // Positioned via inline top/left coordinates computed from the trigger rect
    // (position: fixed itself comes from the CSS module class, not inline style).
    expect(popover.style.top).not.toBe('');
    expect(popover.style.left).not.toBe('');
  });

  it('closes the popover when the trigger is clicked again', () => {
    render(<HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>);
    const trigger = screen.getByRole('button', { name: `Help: ${CONCEPT}` });
    fireEvent.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>);
    fireEvent.click(screen.getByRole('button', { name: `Help: ${CONCEPT}` }));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes on an outside click but stays open when clicking inside the popover', () => {
    render(
      <div>
        <HelpPopover concept={CONCEPT}>{TEXT}</HelpPopover>
        <button type="button">outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: `Help: ${CONCEPT}` }));
    const popover = screen.getByRole('tooltip');

    // Clicking inside the popover does not close it.
    fireEvent.mouseDown(popover);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Clicking outside closes it.
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('auto-opens on first mount when the concept is not yet suppressed', () => {
    localStorage.clear(); // not suppressed → should auto-open
    render(<HelpPopover concept="fresh-concept">{TEXT}</HelpPopover>);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});