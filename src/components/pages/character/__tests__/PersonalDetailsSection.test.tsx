import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonalDetailsSection } from '../PersonalDetailsSection';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character } from '../../../../types/character';

/**
 * Additive unit tests for the extracted PersonalDetailsSection component
 * (spec: character-page-decomposition, Task 2.2 — seam b).
 *
 * These assert DOM/class parity with the pre-refactor Portrait + Personal
 * Details card + Generate panel block, and verify the component's internal
 * `usePersonalDetailsGeneration` wiring (roll buttons call the injected
 * `update`). They are NEW and do not modify any existing CharacterPage
 * assertions (Req 4.2, 4.3). The end-to-end roll behaviour remains guarded by
 * the unchanged `PersonalDetails.integration.test.tsx`.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

interface RenderOptions {
  character?: Partial<Character>;
}

function renderSection(opts: RenderOptions = {}) {
  const { character: overrides = {} } = opts;
  const char = makeCharacter(overrides);
  const update = vi.fn();
  const handlePortraitUpload = vi.fn();
  const handlePortraitRemove = vi.fn();
  const handleSpeciesChange = vi.fn();
  const handleClassChange = vi.fn();
  const handleCareerChange = vi.fn();

  const result = render(
    <PersonalDetailsSection
      character={char}
      update={update}
      portraitURL={''}
      handlePortraitUpload={handlePortraitUpload}
      handlePortraitRemove={handlePortraitRemove}
      handleSpeciesChange={handleSpeciesChange}
      handleClassChange={handleClassChange}
      handleCareerChange={handleCareerChange}
      filteredCareers={[]}
    />,
  );

  return { ...result, update, handleSpeciesChange, handleClassChange, handleCareerChange, char };
}

function mockRandomSequence(values: number[]) {
  const queue = [...values];
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    if (queue.length === 0) return 0.5;
    return queue.shift()!;
  });
}

describe('PersonalDetailsSection (extracted seam b)', () => {
  let randomSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    if (randomSpy) randomSpy.mockRestore();
    randomSpy = undefined;
  });

  it('renders the Personal Details card header and identity row', () => {
    const { container } = renderSection({ character: { name: 'Franz' } });
    expect(screen.getByText('Personal Details')).toBeInTheDocument();
    expect(container.querySelector('[class*="identityRow"]')).toBeInTheDocument();
    expect(container.querySelector('[class*="gridAutoFill"]')).toBeInTheDocument();
  });

  it('renders the species/class/career selects', () => {
    renderSection({ character: { species: 'Human / Reiklander' } });
    // Species select shows the current value
    const species = screen.getByDisplayValue('Human / Reiklander');
    expect(species.tagName).toBe('SELECT');
  });

  it('routes species/class change through the injected handlers', () => {
    const { handleSpeciesChange, container } = renderSection();
    const selects = container.querySelectorAll('select');
    // First select is Species, second is Class, third is Career
    fireEvent.change(selects[0], { target: { value: 'Dwarf' } });
    expect(handleSpeciesChange).toHaveBeenCalledWith('Dwarf');
  });

  it('shows the Generate panel when details are not all filled', () => {
    renderSection({ character: { species: 'Human / Reiklander' } });
    expect(screen.getByRole('button', { name: 'Roll Age' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Height' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Hair' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Eyes' })).toBeInTheDocument();
  });

  it('hides the Generate panel once age/height/hair/eyes are all filled', () => {
    renderSection({ character: { species: 'Human / Reiklander', age: '22', height: '5\'4"', hair: 'Brown', eyes: 'Blue' } });
    expect(screen.queryByRole('button', { name: 'Roll Age' })).not.toBeInTheDocument();
  });

  it('wires the hook: clicking Roll Age calls the injected update', () => {
    // Human age = 15 + 1d10. Math.floor(0.6 * 10) + 1 = 7 → age 22
    randomSpy = mockRandomSequence([0.6]);
    const { update } = renderSection({ character: { species: 'Human / Reiklander' } });
    fireEvent.click(screen.getByRole('button', { name: 'Roll Age' }));
    expect(update).toHaveBeenCalledWith('age', '22');
  });

  it('disables roll buttons when species is empty', () => {
    renderSection({ character: { species: '' } });
    expect(screen.getByRole('button', { name: 'Roll Age' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Roll Hair' })).toBeDisabled();
  });

  it('renders the Sex select in the Personal Details card with Male/Female/Other', () => {
    renderSection({ character: { sex: 'Female' } });
    const sexSelect = screen.getByLabelText('Sex') as HTMLSelectElement;
    expect(sexSelect.tagName).toBe('SELECT');
    expect(sexSelect.value).toBe('Female');
    // Scope option checks to the card select (the Generate panel also has a Sex select).
    const optionLabels = Array.from(sexSelect.options).map((o) => o.textContent);
    expect(optionLabels).toContain('Male');
    expect(optionLabels).toContain('Female');
    expect(optionLabels).toContain('Other');
  });

  it('routes a Sex selection through the injected update', () => {
    const { update } = renderSection();
    fireEvent.change(screen.getByLabelText('Sex'), { target: { value: 'Other' } });
    expect(update).toHaveBeenCalledWith('sex', 'Other');
  });

  it('wires the hook: clicking Roll Sex calls update with Male or Female', () => {
    // Math.random < 0.5 → Male; here 0.2 forces Male deterministically.
    randomSpy = mockRandomSequence([0.2]);
    const { update } = renderSection({ character: { species: 'Human / Reiklander' } });
    fireEvent.click(screen.getByRole('button', { name: 'Roll Sex' }));
    expect(update).toHaveBeenCalledWith('sex', 'Male');
  });
});
