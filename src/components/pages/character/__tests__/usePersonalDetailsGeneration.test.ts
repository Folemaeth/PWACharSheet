import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonalDetailsGeneration } from '../usePersonalDetailsGeneration';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character, FieldPath, FieldValue } from '../../../../types/character';
import {
  generateAge,
  generateHeight,
  humanHeightNeedsBonus,
  lookupHairColour,
  lookupEyeColour,
  formatVariegatedEyes,
} from '../../../../logic/personal-details';

/**
 * Additive unit tests for the extracted usePersonalDetailsGeneration hook
 * (spec: character-page-decomposition, Task 2.1 — seam b).
 *
 * These are NEW tests. They do not touch any existing CharacterPage or
 * PersonalDetails integration assertions (Req 4.2, 4.3). Math.random is mocked
 * with a seeded queue so the roll handlers are exercised deterministically;
 * each expected value is derived from the SAME pure logic the hook calls, which
 * guards that the verbatim-copied RNG wiring was preserved (Req 8.3).
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

/**
 * Seed Math.random with a fixed queue. Each call pops the next value.
 * A die is computed as Math.floor(v * 10) + 1, so v=0.4 → 5, v=0.9 → 10.
 */
function seedRandom(values: number[]) {
  const queue = [...values];
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    if (queue.length === 0) return 0.5;
    return queue.shift()!;
  });
}

/** Convert a seed value in [0,1) to the die it produces. */
function dieFor(v: number): number {
  return Math.floor(v * 10) + 1;
}

/** Build a typed `update` spy compatible with the hook's signature. */
function makeUpdate() {
  return vi.fn() as unknown as {
    <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>): void;
    mock: { calls: unknown[][] };
  };
}

describe('usePersonalDetailsGeneration (extracted seam b)', () => {
  let randomSpy: ReturnType<typeof seedRandom> | undefined;

  beforeEach(() => {
    randomSpy = undefined;
  });

  afterEach(() => {
    if (randomSpy) randomSpy.mockRestore();
  });

  it('exposes derived speciesGroup and allDetailsFilled', () => {
    const update = makeUpdate();
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({
        character: makeCharacter({ species: 'Human', age: '25', height: `5'7"`, hair: 'Brown', eyes: 'Blue' }),
        update,
      }),
    );
    expect(result.current.speciesGroup).toBe('Human');
    expect(result.current.allDetailsFilled).toBe(true);
  });

  it('rollAge writes the same age as the pure generateAge for the seeded die (Human)', () => {
    const update = makeUpdate();
    const seed = [0.4]; // Human age = 1 die
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'Human' }), update }),
    );

    act(() => result.current.rollAge());

    const expected = String(generateAge('Human', [dieFor(seed[0])]));
    expect(update).toHaveBeenCalledWith('age', expected);
  });

  it('rollHeight uses the bonus die when a Human roll contains a 10', () => {
    const update = makeUpdate();
    // Human height = 2 dice; a 10 triggers the bonus die (humanHeightNeedsBonus).
    const seed = [0.9, 0.2, 0.5]; // dice = 10, 3; bonus die = 6
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'Human' }), update }),
    );

    act(() => result.current.rollHeight());

    const dice = [dieFor(seed[0]), dieFor(seed[1])];
    expect(humanHeightNeedsBonus(dice as [number, number])).toBe(true);
    const expected = generateHeight('Human', dice, dieFor(seed[2]));
    expect(update).toHaveBeenCalledWith('height', expected);
  });

  it('rollHeight skips the bonus die when no Human die is a 10', () => {
    const update = makeUpdate();
    const seed = [0.2, 0.5]; // dice = 3, 6 — no 10, so no bonus die consumed
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'Human' }), update }),
    );

    act(() => result.current.rollHeight());

    const dice = [dieFor(seed[0]), dieFor(seed[1])];
    expect(humanHeightNeedsBonus(dice as [number, number])).toBe(false);
    const expected = generateHeight('Human', dice);
    expect(update).toHaveBeenCalledWith('height', expected);
    // Only two Math.random calls were made (no bonus die).
    expect(randomSpy!).toHaveBeenCalledTimes(2);
  });

  it('rollHair writes the looked-up hair colour for the 2d10 sum', () => {
    const update = makeUpdate();
    const seed = [0.4, 0.5]; // dice = 5, 6 → sum 11
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'Human' }), update }),
    );

    act(() => result.current.rollHair());

    const sum = dieFor(seed[0]) + dieFor(seed[1]);
    expect(update).toHaveBeenCalledWith('hair', lookupHairColour('Human', sum));
  });

  it('rollEyes for a non-Elf writes eyes and does not open the second-colour roll', () => {
    const update = makeUpdate();
    const seed = [0.4, 0.5];
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'Human' }), update }),
    );

    act(() => result.current.rollEyes());

    const sum = dieFor(seed[0]) + dieFor(seed[1]);
    expect(update).toHaveBeenCalledWith('eyes', lookupEyeColour('Human', sum));
    expect(result.current.showSecondEyeRoll).toBe(false);
    expect(result.current.firstEyeColour).toBeNull();
  });

  it('rollEyes for a High Elf opens the second-colour roll and records the first colour', () => {
    const update = makeUpdate();
    const seed = [0.4, 0.5];
    randomSpy = seedRandom(seed);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'High Elf' }), update }),
    );

    act(() => result.current.rollEyes());

    const sum = dieFor(seed[0]) + dieFor(seed[1]);
    const first = lookupEyeColour('High_Elf', sum);
    expect(update).toHaveBeenCalledWith('eyes', first);
    expect(result.current.showSecondEyeRoll).toBe(true);
    expect(result.current.firstEyeColour).toBe(first);
  });

  it('rollSecondEyeColour combines both colours and closes the second-colour roll', () => {
    const update = makeUpdate();
    // First eye roll (Elf): dice sum from [0.4, 0.5]; second roll: [0.1, 0.2]
    randomSpy = seedRandom([0.4, 0.5, 0.1, 0.2]);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: 'High Elf' }), update }),
    );

    act(() => result.current.rollEyes());
    const first = result.current.firstEyeColour!;

    act(() => result.current.rollSecondEyeColour());

    const secondSum = dieFor(0.1) + dieFor(0.2);
    const second = lookupEyeColour('High_Elf', secondSum);
    expect(update).toHaveBeenLastCalledWith('eyes', formatVariegatedEyes(first, second));
    expect(result.current.showSecondEyeRoll).toBe(false);
    expect(result.current.firstEyeColour).toBeNull();
  });

  it('rollAge is a no-op when the species has no group', () => {
    const update = makeUpdate();
    randomSpy = seedRandom([0.4]);
    const { result } = renderHook(() =>
      usePersonalDetailsGeneration({ character: makeCharacter({ species: '' }), update }),
    );

    act(() => result.current.rollAge());
    expect(update).not.toHaveBeenCalled();
  });

  it('resets the transient generation state when the character species changes', () => {
    const update = makeUpdate();
    randomSpy = seedRandom([0.4, 0.5]);
    let character = makeCharacter({ species: 'High Elf' });
    const { result, rerender } = renderHook(
      ({ character }) => usePersonalDetailsGeneration({ character, update }),
      { initialProps: { character } },
    );

    // Open the second-eye roll and pick an age tier.
    act(() => result.current.rollEyes());
    act(() => result.current.setSelectedAgeTier({ label: 'Time of Steel', base: 120, diceCount: 9 }));
    expect(result.current.showSecondEyeRoll).toBe(true);
    expect(result.current.firstEyeColour).not.toBeNull();
    expect(result.current.selectedAgeTier).toBeDefined();

    // Change species → the reset effect (prevSpeciesRef) clears transient state.
    character = makeCharacter({ species: 'Human' });
    rerender({ character });

    expect(result.current.showSecondEyeRoll).toBe(false);
    expect(result.current.firstEyeColour).toBeNull();
    expect(result.current.selectedAgeTier).toBeUndefined();
  });
});
