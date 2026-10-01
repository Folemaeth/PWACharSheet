import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WelcomeScreen } from '../shared/WelcomeScreen';
import { generateRandomCharacter } from '../../logic/random-character-generator';
import type { Character } from '../../types/character';

// Avoid rendering the full wizard; this surface only needs the 'initial' mode controls.
vi.mock('../shared/CharacterWizard', () => ({
  CharacterWizard: () => <div data-testid="character-wizard" />,
}));

// Keep file-import side effects inert — the file input is not exercised here.
vi.mock('../../storage/export-import', () => ({
  importFromJSONWithPortrait: vi.fn(),
}));

const baseProps = {
  onCreateCharacter: vi.fn(),
  onWizardComplete: vi.fn(),
  onImportCharacter: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderWelcome(overrides = {}) {
  const props = { ...baseProps, ...overrides };
  return render(<WelcomeScreen {...props} />);
}

// ─── Entry-point: "Create Random Character" (Req 1.1, 1.2, 14.1, 14.2, 14.3, 15.3) ───
describe('WelcomeScreen — Create Random Character control (initial mode)', () => {
  // Req 1.1, 14.1, 14.2: the control is rendered with the correct accessible name
  it('renders a button with accessible name "Create Random Character" when onRandomCharacter is provided', () => {
    renderWelcome({ onRandomCharacter: vi.fn() });
    expect(
      screen.getByRole('button', { name: /create random character/i }),
    ).toBeInTheDocument();
  });

  // Req 14.2: the control is omitted when the parent does not wire the capability
  it('does not render the control when onRandomCharacter is omitted', () => {
    renderWelcome();
    expect(
      screen.queryByRole('button', { name: /create random character/i }),
    ).not.toBeInTheDocument();
  });

  // Req 14.3: the control is focusable and participates in the surface's focus/tab order
  it('is focusable and reachable in tab order after the quick-start control', async () => {
    renderWelcome({ onRandomCharacter: vi.fn() });
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
    renderWelcome({ onRandomCharacter });
    fireEvent.click(screen.getByRole('button', { name: /create random character/i }));
    expect(onRandomCharacter).toHaveBeenCalledTimes(1);
  });

  // Req 1.2, 14.3: activating via keyboard (Enter / Space) invokes the handler
  it('invokes onRandomCharacter when activated by keyboard (Enter and Space)', async () => {
    const onRandomCharacter = vi.fn();
    renderWelcome({ onRandomCharacter });
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
  // Here the test's handler calls the real generator to assert a well-formed Character.
  it('a handler that generates a character yields a well-formed Character on activation', () => {
    let produced: Character | undefined;
    const onRandomCharacter = vi.fn(() => {
      produced = generateRandomCharacter(Math.random);
    });

    renderWelcome({ onRandomCharacter });
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
    renderWelcome({ onRandomCharacter: vi.fn() });
    const randomBtn = screen.getByRole('button', { name: /create random character/i });

    // No native title tooltip.
    expect(randomBtn).not.toHaveAttribute('title');
    // No aria-describedby pointing at a tooltip breakdown.
    expect(randomBtn).not.toHaveAttribute('aria-describedby');
    // The label is a plain action label, not an "A + B = Total" breakdown.
    expect(randomBtn.textContent ?? '').not.toMatch(/=/);
    // No tooltip element rendered on the surface.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
