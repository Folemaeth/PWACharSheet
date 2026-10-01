import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { NewCharacterChoice } from '../shared/NewCharacterChoice';
import { generateRandomCharacter } from '../../logic/random-character-generator';
import type { Character } from '../../types/character';

const baseProps = {
  onQuickStart: vi.fn(),
  onWizard: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderChoice(overrides = {}) {
  const props = { ...baseProps, ...overrides };
  return render(<NewCharacterChoice {...props} />);
}

// ─── Entry-point: "Create Random Character" (Req 1.1, 1.2, 14.1, 14.2, 14.3, 15.3) ───
describe('NewCharacterChoice — Create Random Character control (choice panel)', () => {
  // Req 1.1, 14.1, 14.2: the control is rendered with the correct accessible name
  it('renders a button with accessible name "Create Random Character"', () => {
    renderChoice({ onRandomCharacter: vi.fn() });
    expect(
      screen.getByRole('button', { name: /create random character/i }),
    ).toBeInTheDocument();
  });

  // Req 14.3: the control is focusable and participates in the surface's focus/tab order.
  it('is focusable and reachable in tab order after wizard and quick-start controls', async () => {
    renderChoice({ onRandomCharacter: vi.fn() });
    const user = userEvent.setup();

    // "Create with Wizard" takes initial focus on mount (documented initial-focus control).
    expect(screen.getByRole('button', { name: /create with wizard/i })).toHaveFocus();

    await user.tab(); // → Quick Start
    expect(screen.getByRole('button', { name: /quick start/i })).toHaveFocus();

    await user.tab(); // → Create Random Character (sibling button in tab order)
    const randomBtn = screen.getByRole('button', { name: /create random character/i });
    expect(randomBtn).toHaveFocus();

    // Sanity: it can hold focus directly as well.
    randomBtn.focus();
    expect(randomBtn).toHaveFocus();
  });

  // Req 1.2: activating via click invokes the handler
  it('invokes onRandomCharacter when activated by click', () => {
    const onRandomCharacter = vi.fn();
    renderChoice({ onRandomCharacter });
    fireEvent.click(screen.getByRole('button', { name: /create random character/i }));
    expect(onRandomCharacter).toHaveBeenCalledTimes(1);
  });

  // Req 1.2, 14.3: activating via keyboard (Enter / Space) invokes the handler
  it('invokes onRandomCharacter when activated by keyboard (Enter and Space)', async () => {
    const onRandomCharacter = vi.fn();
    renderChoice({ onRandomCharacter });
    const user = userEvent.setup();

    const randomBtn = screen.getByRole('button', { name: /create random character/i });
    randomBtn.focus();

    await user.keyboard('{Enter}');
    expect(onRandomCharacter).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onRandomCharacter).toHaveBeenCalledTimes(2);
  });

  // Req 1.2 (App-layer intent): the wired handler can produce a well-formed Character.
  // The component-level prop is a plain () => void; the parent generates the Character.
  it('a handler that generates a character yields a well-formed Character on activation', () => {
    let produced: Character | undefined;
    const onRandomCharacter = vi.fn(() => {
      produced = generateRandomCharacter(Math.random);
    });

    renderChoice({ onRandomCharacter });
    fireEvent.click(screen.getByRole('button', { name: /create random character/i }));

    expect(onRandomCharacter).toHaveBeenCalledTimes(1);
    expect(produced).toBeDefined();
    expect(produced?._v).toBe(8);
    expect(typeof produced?.species).toBe('string');
    expect(produced?.species.length).toBeGreaterThan(0);
    expect(typeof produced?.career).toBe('string');
    expect(produced?.career.length).toBeGreaterThan(0);
  });

  // Req 15.3: the control shows no calculated-total value, so it carries no Tooltip/title breakdown.
  it('displays no calculated-total value and has no tooltip/title breakdown attached', () => {
    renderChoice({ onRandomCharacter: vi.fn() });
    const randomBtn = screen.getByRole('button', { name: /create random character/i });

    expect(randomBtn).not.toHaveAttribute('title');
    expect(randomBtn).not.toHaveAttribute('aria-describedby');
    expect(randomBtn.textContent ?? '').not.toMatch(/=/);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
