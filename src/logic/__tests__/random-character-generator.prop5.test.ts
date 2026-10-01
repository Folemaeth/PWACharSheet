import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import { SPECIES_DATA } from '../../data/species';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible. A fresh instance is built
 * per seed so each property run gets an independent, reproducible stream.
 */
function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Feature: random-character-generator, Property 5 — Characteristic initials are
// in-range rolls plus species modifier.

describe('Feature: random-character-generator', () => {
  describe('Property 5 — Characteristic initials are in-range rolls plus species modifier', () => {
    /**
     * **Validates: Requirements 5.1, 5.3, 5.6**
     *
     * For any seed and every characteristic k, `chars[k].i − SPECIES_DATA[species].chars[k]`
     * is a valid 2d10 roll result (Core p.33: roll 2d10 per characteristic). The app stores
     * characteristic values ×10, so a 2d10 roll of 2..20 is stored as 20..200 in steps of 10
     * (the generator does `rollCharacteristics` = roll2d10 ×10, then
     * `chars[k].i = assignedRoll + speciesMod`). Each chars[k] also has numeric i/a/b with b === 0.
     */
    it('every characteristic initial is a stored 2d10 roll (20..200, step 10) plus the species modifier, with numeric i/a/b and b === 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));
          const speciesMods = SPECIES_DATA[char.species].chars;

          for (const k of CHARACTERISTIC_KEYS) {
            const entry = char.chars[k];

            // i/a/b are all numbers.
            expect(typeof entry.i).toBe('number');
            expect(typeof entry.a).toBe('number');
            expect(typeof entry.b).toBe('number');

            // Bonus is always 0 at generation (Req 5.6).
            expect(entry.b).toBe(0);

            // Strip the species modifier (Core p.33 Attributes Table) to recover the raw
            // stored roll, which must be a 2d10 ×10 result: a multiple of 10 in [20, 200],
            // i.e. (i - speciesMod) / 10 is an integer in [2, 20].
            const storedRoll = entry.i - speciesMods[k];
            expect(storedRoll % 10).toBe(0);

            const diceRoll = storedRoll / 10;
            expect(Number.isInteger(diceRoll)).toBe(true);
            expect(diceRoll).toBeGreaterThanOrEqual(2);
            expect(diceRoll).toBeLessThanOrEqual(20);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
