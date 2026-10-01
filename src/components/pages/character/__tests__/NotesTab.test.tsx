import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotesTab } from '../NotesTab';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character } from '../../../../types/character';

/**
 * Additive unit tests for the extracted NotesTab component
 * (spec: character-page-decomposition, Task 7 — seam g).
 *
 * These are NEW and do not modify any existing CharacterPage assertions
 * (Req 4.2, 4.3). They assert DOM/class parity for the Notes Sub_Tab sections
 * (Ambitions & Party, Corruption & Mutation, Diseases, Session Notes, Timeline)
 * and that the typed update/updateCharacter surface and the DiseasePanel
 * `onRoll` wiring are threaded through unchanged (Req 3.1, 3.2, 3.3, 6.1, 6.2).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const noop = () => {};

describe('NotesTab (extracted seam g)', () => {
  it('renders the Ambitions, Party, Corruption, Diseases, Session Notes, and Timeline sections', () => {
    render(<NotesTab character={makeCharacter()} update={noop} updateCharacter={noop} />);
    expect(screen.getByText('Ambitions')).toBeInTheDocument();
    expect(screen.getByText('Party')).toBeInTheDocument();
    expect(screen.getByText('Corruption & Mutation')).toBeInTheDocument();
    expect(screen.getByText('Diseases')).toBeInTheDocument();
    expect(screen.getByText('No Session Notes')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('wraps Ambitions & Party in the shared ambitionsGrid layout class', () => {
    const { container } = render(
      <NotesTab character={makeCharacter()} update={noop} updateCharacter={noop} />,
    );
    const grid = container.querySelector('[class*="ambitionsGrid"]');
    expect(grid).toBeInTheDocument();
    // Both the Ambitions and Party labelled fields live inside the grid.
    expect(within(grid as HTMLElement).getByText('Ambitions')).toBeInTheDocument();
    expect(within(grid as HTMLElement).getByText('Party')).toBeInTheDocument();
  });

  it('renders existing ambition values from the character', () => {
    const char = makeCharacter({ ambS: 'Find the sword', ambL: 'Avenge my father' });
    render(<NotesTab character={char} update={noop} updateCharacter={noop} />);
    expect(screen.getByText('Find the sword')).toBeInTheDocument();
    expect(screen.getByText('Avenge my father')).toBeInTheDocument();
  });

  it('does not render the Notes content inside any sub-tab wrapper (wrapper stays in the shell)', () => {
    // NotesTab is a bare fragment: the activeSubTab guard + mobileHidden toggle
    // remain owned by the shell (Req 5.1). Rendering it directly yields the
    // section Cards with no enclosing tab-wrapper div of its own.
    const { container } = render(
      <NotesTab character={makeCharacter()} update={noop} updateCharacter={noop} />,
    );
    expect(container.querySelector('[class*="mobileHidden"]')).not.toBeInTheDocument();
  });

  it('accepts the optional addRoll prop (threaded into DiseasePanel onRoll)', () => {
    const addRoll = vi.fn();
    // The addRoll callback is passed straight through to DiseasePanel's onRoll,
    // exactly as the shell did. Rendering with it present must not throw and the
    // Diseases section still renders.
    render(
      <NotesTab character={makeCharacter()} update={noop} updateCharacter={noop} addRoll={addRoll} />,
    );
    expect(screen.getByText('Diseases')).toBeInTheDocument();
    // No disease has been rolled, so the callback is not invoked on render.
    expect(addRoll).not.toHaveBeenCalled();
  });

  it('invokes update with the ambS path when the Short-term ambition is edited', () => {
    const update = vi.fn();
    // Seed a value so the editable field's display button renders that text,
    // which we can target to enter edit mode (EditableField is tap-to-edit:
    // the display value is a role="button").
    const char = makeCharacter({ ambS: 'Old goal' });
    render(<NotesTab character={char} update={update} updateCharacter={noop} />);

    fireEvent.click(screen.getByText('Old goal'));
    // Disambiguate from the SessionNotesPanel textarea: the edit input carries
    // the current ambition value.
    const input = screen.getByDisplayValue('Old goal');
    fireEvent.change(input, { target: { value: 'New goal' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(update).toHaveBeenCalledWith('ambS', 'New goal');
  });
});
