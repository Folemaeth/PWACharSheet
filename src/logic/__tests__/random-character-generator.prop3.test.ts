import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { rollSpecies, generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

// Feature: random-character-generator, Property 3 — Species mapping follows the Random Species Table

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
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

/**
 * RNG that forces `rollD100` to land exactly on roll `r` (1..100). `rollD100`
 * computes `floor(x * 100) + 1`, so x = (r - 1) / 100 yields exactly `r`.
 */
function fixedD100Rng(r: number): RNG {
  return () => (r - 1) / 100;
}

/**
 * Expected species for a d100 roll per the Core p.24 Random Species Table:
 *   01–90 Human / Reiklander, 91–94 Halfling, 95–98 Dwarf, 99 High Elf, 00(=100) Wood Elf.
 */
function expectedSpecies(roll: number): string {
  if (roll <= 90) return 'Human / Reiklander';
  if (roll <= 94) return 'Halfling';
  if (roll <= 98) return 'Dwarf';
  if (roll === 99) return 'High Elf';
  return 'Wood Elf';
}

/** The five species keys the Random Species Table can produce (Core p.24). */
const TABLE_SPECIES = [
  'Human / Reiklander',
  'Halfling',
  'Dwarf',
  'High Elf',
  'Wood Elf',
] as const;

describe('Feature: random-character-generator', () => {
  describe('Property 3 — Species mapping follows the Random Species Table', () => {
    /**
     * **Validates: Requirements 3.1, 3.2, 3.3**
     *
     * Two aspects of the same mapping invariant, each ≥100 iterations:
     *  (a) For every d100 roll in 1..100, `rollSpecies` returns exactly the table
     *      band species (Core p.24 Random Species Table).
     *  (b) For any seed, `generateRandomCharacter`'s species is one of the five
     *      table keys.
     */

    it('(a) over all d100 rolls 1..100 the mapping is exactly the table band species', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (roll) => {
          expect(rollSpecies(fixedD100Rng(roll))).toBe(expectedSpecies(roll));
        }),
        { numRuns: 200 },
      );
    });

    it('(b) over fast-check seeds the generated species is one of the five table keys', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0x7fffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed));
          expect(TABLE_SPECIES).toContain(char.species);
        }),
        { numRuns: 200 },
      );
    });
  });
});
