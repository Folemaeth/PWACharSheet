import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QuickDiceRoller, QUICK_DICE_PREFS_KEY } from '../QuickDiceRoller';
import { Navigation } from '../../layout/Navigation';
import { CommandPaletteProvider } from '../../command-palette/CommandPaletteContext';

describe('QuickDiceRoller', () => {
  beforeEach(() => {
    localStorage.removeItem(QUICK_DICE_PREFS_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rolls a d100 by default', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.46);
    render(<QuickDiceRoller onClose={vi.fn()} />);

    expect(screen.getByText('No roll yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Roll d100' }));

    expect(screen.getByTestId('quick-roll-total')).toHaveTextContent('47');
    expect(screen.queryByRole('list', { name: 'Individual dice' })).not.toBeInTheDocument();
  });

  it('shows every d10 and their sum', () => {
    const values = [0.6, 0.1, 0.85];
    vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
    render(<QuickDiceRoller onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Nd10' }));
    fireEvent.click(screen.getByRole('button', { name: 'More dice' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll 3d10' }));

    const dice = within(screen.getByRole('list', { name: 'Individual dice' })).getAllByRole('listitem');
    expect(dice.map((die) => die.textContent)).toEqual(['7', '2', '9']);
    expect(screen.getByTestId('quick-roll-total')).toHaveTextContent('Total 18');
  });

  it('keeps earlier rolls below the latest one', () => {
    const values = [0.04, 0.89];
    vi.spyOn(Math, 'random').mockImplementation(() => values.shift() ?? 0);
    render(<QuickDiceRoller onClose={vi.fn()} />);

    const rollBtn = screen.getByRole('button', { name: 'Roll d100' });
    fireEvent.click(rollBtn);
    fireEvent.click(rollBtn);

    expect(screen.getByTestId('quick-roll-total')).toHaveTextContent('90');
    const earlier = screen.getByRole('region', { name: 'Earlier rolls' });
    expect(within(earlier).getByText('5')).toBeInTheDocument();
  });

  it('limits the d10 pool to 1..20', () => {
    render(<QuickDiceRoller onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nd10' }));

    const fewer = screen.getByRole('button', { name: 'Fewer dice' });
    fireEvent.click(fewer);
    expect(fewer).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Roll d10' })).toBeInTheDocument();

    const more = screen.getByRole('button', { name: 'More dice' });
    for (let i = 0; i < 25; i++) fireEvent.click(more);
    expect(more).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Roll 20d10' })).toBeInTheDocument();
  });

  it('remembers the last dice type and pool size', () => {
    const { unmount } = render(<QuickDiceRoller onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Nd10' }));
    fireEvent.click(screen.getByRole('button', { name: 'More dice' }));
    fireEvent.click(screen.getByRole('button', { name: 'More dice' }));
    unmount();

    render(<QuickDiceRoller onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Nd10' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Roll 4d10' })).toBeInTheDocument();
  });

  it('starts focused on the roll button', () => {
    render(<QuickDiceRoller onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Roll d100' })).toHaveFocus();
  });

  it('closes on Escape, backdrop click and the close button', () => {
    const onClose = vi.fn();
    render(<QuickDiceRoller onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('dialog', { name: 'Quick dice roller' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(3);
  });
});

describe('Navigation dice button', () => {
  it('opens the roller and blocks page shortcuts while it is open', () => {
    const onPageChange = vi.fn();
    render(
      <CommandPaletteProvider>
        <Navigation activePage="character" onPageChange={onPageChange} />
      </CommandPaletteProvider>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Roll dice' })[0]);
    expect(screen.getByRole('dialog', { name: 'Quick dice roller' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '2' });
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Quick dice roller' })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: '2' });
    expect(onPageChange).toHaveBeenCalled();
  });
});
