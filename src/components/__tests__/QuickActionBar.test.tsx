import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickActionBar } from '../shared/QuickActionBar';
import type { QuickAction } from '../shared/QuickActionBar';

const actions: QuickAction[] = [
  { id: '1', skillName: 'Dodge' },
  { id: '2', skillName: 'Cool' },
];

describe('QuickActionBar', () => {
  it('renders nothing when there are no actions', () => {
    const { container } = render(<QuickActionBar actions={[]} onTrigger={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a button per action and triggers with the right action', () => {
    const onTrigger = vi.fn();
    render(<QuickActionBar actions={actions} onTrigger={onTrigger} />);

    fireEvent.click(screen.getByLabelText('Quick roll Dodge'));
    expect(onTrigger).toHaveBeenCalledWith(actions[0]);
  });

  it('defaults to the floating variant', () => {
    render(<QuickActionBar actions={actions} onTrigger={vi.fn()} />);
    expect(screen.getByTestId('quick-action-bar')).toHaveAttribute('data-variant', 'floating');
  });

  it('renders a docked variant with a "Quick Rolls" label when requested (#2)', () => {
    render(<QuickActionBar actions={actions} onTrigger={vi.fn()} variant="docked" />);
    const bar = screen.getByTestId('quick-action-bar');
    expect(bar).toHaveAttribute('data-variant', 'docked');
    expect(bar).toHaveTextContent('Quick Rolls');
    // Action buttons are still present in the docked variant.
    expect(screen.getByLabelText('Quick roll Cool')).toBeInTheDocument();
  });

  it('caps rendered actions at 6', () => {
    const many: QuickAction[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      skillName: `Skill${i}`,
    }));
    render(<QuickActionBar actions={many} onTrigger={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });
});
