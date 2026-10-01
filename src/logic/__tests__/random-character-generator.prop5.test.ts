import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import { SPECIES_DATA } from '../../data/species';

/**
 * Deterministic seeded RNG (mulberry32) - TEST UTILITY ONLY.
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

// Feature: random-character-generator, Property 5 - Characteristic initials are
// in-range rolls plus species modifier.

describe('Feature: random-character-generator', () => {
  describe('Property 5 - Characteristic initials are in-range rolls plus species modifier', () => {
    /**
     * **Validates: Requirements 5.1, 5.3, 5.6**
     *
     * For any seed and every characteristic k, `chars[k].i - SPECIES_DATA[species].chars[k]`
     * is a valid raw 2d10 roll result in [2, 20]. Per the Core Rulebook p.33 Attributes
     * Table, each Characteristic is `2d10 + species modifier` on the RAW scale (there is no
     * x10 scaling in WFRP4e - e.g. Human Weapon Skill is 2d10+20, i.e. 22..40). The species
     * modifiers in SPECIES_DATA are already on that raw scale, and getBonus(value) =
     * floor(value / 10) treats the stored value as raw. So the generator does
     * `chars[k].i = rawRoll + speciesMod` where rawRoll is a 2d10 result. Each chars[k] also
     * has numeric i/a/b with b === 0 (Req 5.6).
     */
    it('every characteristic initial is a raw 2d10 roll (2..20) plus the species modifier, with numeric i/a/b and b === 0', () => {
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
            // 2d10 roll, which must be an integer in [2, 20].
            const diceRoll = entry.i - speciesMods[k];
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