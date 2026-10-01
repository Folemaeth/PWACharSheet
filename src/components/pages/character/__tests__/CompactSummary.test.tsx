import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CompactSummary } from '../CompactSummary';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character } from '../../../../types/character';

/**
 * Additive unit tests for the extracted CompactSummary component
 * (spec: character-page-decomposition, Task 1 — seam a).
 *
 * These assert DOM/class parity with the pre-refactor compact block. They are
 * NEW and do not modify any existing CharacterPage assertions (Req 4.2, 4.3).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

describe('CompactSummary (extracted seam a)', () => {
  it('renders the compact summary wrapper', () => {
    const { container } = render(<CompactSummary character={makeCharacter({ name: 'Brunhilde' })} />);
    expect(container.querySelector('[class*="compactSummary"]')).toBeInTheDocument();
  });

  it('renders name, species, and career', () => {
    const { container } = render(
      <CompactSummary character={makeCharacter({ name: 'Franz', species: 'Human', career: 'Witch Hunter' })} />,
    );
    expect(container.querySelector('[class*="compactName"]')).toHaveTextContent('Franz');
    expect(container.querySelector('[class*="compactMeta"]')).toHaveTextContent('Human · Witch Hunter');
  });

  it('shows "(Unnamed)" when the name is empty', () => {
    const { container } = render(<CompactSummary character={makeCharacter({ name: '' })} />);
    expect(container.querySelector('[class*="compactName"]')).toHaveTextContent('(Unnamed)');
  });

  it('renders the wounds row with current wounds', () => {
    const { container } = render(<CompactSummary character={makeCharacter({ name: 'X', wCur: 8 })} />);
    const wounds = container.querySelector('[class*="compactWounds"]');
    expect(wounds).toBeInTheDocument();
    expect(wounds).toHaveTextContent(/Wounds:.*8/);
  });

  it('renders all ten characteristic cells with computed totals', () => {
    const char = makeCharacter({
      name: 'Test',
      chars: {
        ...BLANK_CHARACTER.chars,
        WS: { i: 30, a: 5, b: 0 },
        BS: { i: 25, a: 0, b: 0 },
      },
    });
    const { container } = render(<CompactSummary character={char} />);
    const cells = container.querySelectorAll('[class*="compactCharCell"]');
    expect(cells.length).toBe(10);

    expect(cells[0].querySelector('[class*="compactCharLabel"]')).toHaveTextContent('WS');
    expect(cells[0].querySelector('[class*="compactCharValue"]')).toHaveTextContent('35');
    expect(cells[1].querySelector('[class*="compactCharLabel"]')).toHaveTextContent('BS');
    expect(cells[1].querySelector('[class*="compactCharValue"]')).toHaveTextContent('25');
  });

  it('lists only equipped weapons', () => {
    const char = makeCharacter({
      name: 'Test',
      weapons: [
        { name: 'Sword', group: 'Basic', damage: '+SB+4', rangeReach: '', qualities: '', enc: '1', equipped: true },
        { name: 'Dagger', group: 'Basic', damage: '+SB+1', rangeReach: '', qualities: '', enc: '0', equipped: true },
        { name: 'Bow', group: 'Basic', damage: '+SB+3', rangeReach: '20/40', qualities: '', enc: '1', equipped: false },
      ],
    });
    const { container } = render(<CompactSummary character={char} />);
    const weapons = container.querySelector('[class*="compactWeapons"]');
    expect(weapons).toBeInTheDocument();
    expect(weapons).toHaveTextContent('Sword, Dagger');
  });

  it('omits the weapons row when there are no weapons', () => {
    const { container } = render(<CompactSummary character={makeCharacter({ name: 'Test', weapons: [] })} />);
    expect(container.querySelector('[class*="compactWeapons"]')).not.toBeInTheDocument();
  });
});
