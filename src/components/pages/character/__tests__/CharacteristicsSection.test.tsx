import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacteristicsSection } from '../CharacteristicsSection';
import { CharacterBreakdownTooltips, type BreakdownTooltipState } from '../../CharacterBreakdownTooltips';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character, CharacteristicKey } from '../../../../types/character';

/**
 * Additive unit tests for the extracted CharacteristicsSection component
 * (spec: character-page-decomposition, Task 3 — seam c).
 *
 * These are NEW and do not modify any existing CharacterPage assertions
 * (Req 4.2, 4.3). They assert DOM/class parity, the CB-breakdown wiring, the
 * single-tooltip-at-a-time invariant, and that the CB calculated-total shows
 * its breakdown via the shared Tooltip (Req 6.3, 6.4; calculated-totals rule).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const noop = () => {};

interface HarnessProps {
  character: Character;
  openCharacteristicRoll?: (key: CharacteristicKey) => void;
}

/**
 * Renders CharacteristicsSection with the shell-owned tooltip state wired the
 * same way the real shell wires it: `openBreakdownTooltip` clears `charTooltip`
 * and vice-versa. It also renders CharacterBreakdownTooltips so the CB breakdown
 * shows through the shared Tooltip, exactly as in the shell.
 */
function Harness({ character, openCharacteristicRoll = noop }: HarnessProps) {
  const [charTooltip, setCharTooltip] = useState<{ key: CharacteristicKey; anchorEl: HTMLElement } | null>(null);
  const [breakdownTooltip, setBreakdownTooltip] = useState<BreakdownTooltipState>(null);

  const openBreakdownTooltip = (state: NonNullable<BreakdownTooltipState>) => {
    setBreakdownTooltip(state);
    setCharTooltip(null);
  };
  const closeBreakdownTooltip = () => setBreakdownTooltip(null);

  return (
    <>
      <CharacteristicsSection
        character={character}
        update={noop}
        updateCharacter={noop}
        openCharacteristicRoll={openCharacteristicRoll}
        charTooltip={charTooltip}
        setCharTooltip={setCharTooltip}
        breakdownTooltip={breakdownTooltip}
        openBreakdownTooltip={openBreakdownTooltip}
        closeBreakdownTooltip={closeBreakdownTooltip}
      />
      <CharacterBreakdownTooltips
        breakdownTooltip={breakdownTooltip}
        character={character}
        onClose={closeBreakdownTooltip}
      />
    </>
  );
}

describe('CharacteristicsSection (extracted seam c)', () => {
  it('renders the characteristics grid and Movement / Wound Maximum sections', () => {
    const { container } = render(<Harness character={makeCharacter()} />);
    expect(container.querySelector('[class*="charGrid"]')).toBeInTheDocument();
    expect(screen.getByText('Characteristics')).toBeInTheDocument();
    expect(screen.getByText('Movement')).toBeInTheDocument();
    // Wound Maximum appears both as the collapsible label and the card header.
    expect(screen.getAllByText('Wound Maximum').length).toBeGreaterThan(0);
  });

  it('renders all ten characteristic rows with computed Current totals', () => {
    const char = makeCharacter({
      chars: {
        ...BLANK_CHARACTER.chars,
        WS: { i: 30, a: 5, b: 0 },
      },
    });
    const { container } = render(<Harness character={char} />);
    const rows = container.querySelectorAll('[class*="charGridRow"]');
    expect(rows.length).toBe(10);
    // WS is the first row: 30 + 5 + 0 = 35.
    expect(within(rows[0] as HTMLElement).getByText('35')).toBeInTheDocument();
  });

  it('toggles the T. Bonus column via local showTBonus state', () => {
    render(<Harness character={makeCharacter()} />);
    const toggle = screen.getByRole('button', { name: /show details/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('T. Bonus')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /hide details/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('T. Bonus')).toBeInTheDocument();
  });

  it('invokes openCharacteristicRoll when the dice button is clicked', () => {
    const openRoll = vi.fn();
    render(<Harness character={makeCharacter()} openCharacteristicRoll={openRoll} />);
    // First dice button corresponds to WS (CHAR_KEYS[0]).
    fireEvent.click(screen.getByRole('button', { name: 'Roll Weapon Skill' }));
    expect(openRoll).toHaveBeenCalledWith('WS');
  });

  it('opens the CB calculated-total breakdown via the shared Tooltip', () => {
    const char = makeCharacter({
      chars: {
        ...BLANK_CHARACTER.chars,
        WS: { i: 42, a: 0, b: 0 },
      },
    });
    render(<Harness character={char} />);

    // CB cell for WS: Current 42 → CB 4. Clicking it opens the breakdown tooltip.
    const cbCell = screen.getByRole('button', { name: 'CB breakdown for Weapon Skill' });
    expect(cbCell).not.toHaveAttribute('aria-describedby');
    fireEvent.click(cbCell);

    // The breakdown renders through the shared Tooltip with its title + values.
    expect(screen.getByText('Weapon Skill CB')).toBeInTheDocument();
    expect(screen.getByText('Current:')).toBeInTheDocument();
    // Content shows the CB total (4) and the contributing current value (42).
    expect(screen.getByText('CB:')).toBeInTheDocument();
    const tooltip = document.getElementById('tooltip-breakdown-cb-WS');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveTextContent('42');
    expect(tooltip).toHaveTextContent('4');
  });

  it('keeps at most one tooltip open — opening the CB breakdown clears the Current tooltip', () => {
    render(<Harness character={makeCharacter()} />);

    // Open the "Current" cell tooltip for WS first.
    const currentCell = screen.getAllByRole('button').find(
      (el) => el.getAttribute('aria-describedby') === null && el.textContent === '0',
    );
    // Fall back to querying by the char tooltip trigger id wiring: click the
    // first current cell (WS) which displays its computed total.
    const wsCurrent = currentCell ?? screen.getAllByRole('button')[0];
    fireEvent.click(wsCurrent);

    // Now open the CB breakdown for WS — the single-tooltip invariant should
    // leave only the breakdown tooltip present (Req 5.5).
    fireEvent.click(screen.getByRole('button', { name: 'CB breakdown for Weapon Skill' }));
    expect(document.getElementById('tooltip-breakdown-cb-WS')).toBeInTheDocument();
    // The characteristic Current tooltip for WS must not also be present.
    expect(document.getElementById('tooltip-char-WS')).not.toBeInTheDocument();
  });

  it('shows the wound-maximum additive breakdown (calculated-total)', () => {
    const char = makeCharacter({
      woundsUseSB: true,
      chars: {
        ...BLANK_CHARACTER.chars,
        S: { i: 30, a: 0, b: 0 },
        T: { i: 40, a: 0, b: 0 },
        WP: { i: 30, a: 0, b: 0 },
      },
    });
    const { container } = render(<Harness character={char} />);
    // SB 3 + 2×TB 8 + WPB 3 = 14.
    const breakdown = container.querySelector('[class*="woundFormulaBreakdown"]');
    expect(breakdown).toBeInTheDocument();
    expect(breakdown).toHaveTextContent('SB 3 + 2×TB 8 + WPB 3 = 14');
  });
});
