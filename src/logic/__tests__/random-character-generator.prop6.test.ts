import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter, assignByRearrange } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import type { CharacteristicKey } from '../../types/character';
import { SPECIES_DATA } from '../../data/species';
import { CAREER_SCHEMES } from '../../data/careers';

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

/** Sorted-ascending copy of an array of numbers (multiset comparison helper). */
function sortedAsc(xs: number[]): number[] {
  return [...xs].sort((a, b) => a - b);
}

// Feature: random-character-generator, Property 6 — Rearrange assigns the highest
// rolls to advance-scheme characteristics.

describe('Feature: random-character-generator', () => {
  describe('Property 6 — Rearrange assigns the highest rolls to advance-scheme characteristics', () => {
    /**
     * **Validates: Requirements 5.2**
     *
     * The core rearrange invariant (Core p.33 Step 2 "rearrange"): the highest rolled
     * values land on the advance-scheme characteristics. We assert this at two levels.
     *
     * (a) Direct test of `assignByRearrange` for the permutation guarantee: given an
     *     arbitrary array of ten rolled values and the scheme chars, the output values are
     *     a permutation of the inputs (same sorted multiset — nothing dropped/duplicated)
     *     AND min(scheme values) >= max(non-scheme values).
     *
     * (b) Generator-level check of the scheme invariant: recover each characteristic's raw
     *     rolled value by stripping the species modifier
     *     (`rawRoll[k] = chars[k].i − SPECIES_DATA[species].chars[k]`); the min raw roll among
     *     advance-scheme chars must be >= the max raw roll among non-scheme chars, and every
     *     raw roll must be a valid raw 2d10 value in [2, 20].
     */

    it('(a) assignByRearrange returns a permutation of its inputs with min(scheme) >= max(non-scheme)', () => {
      fc.assert(
        fc.property(
          // Ten arbitrary rolled values (raw 2d10 domain: integers in [2, 20]),
          // paired with a non-empty subset of the ten characteristics as the scheme.
          fc.array(fc.integer({ min: 2, max: 20 }), { minLength: 10, maxLength: 10 }),
          fc.subarray([...CHARACTERISTIC_KEYS] as CharacteristicKey[], { minLength: 1, maxLength: 9 }),
          (dice, schemeChars) => {
            const rolls = dice;
            const assigned = assignByRearrange(rolls, schemeChars);

            // The ten assigned values are a permutation of the ten input rolls.
            const assignedValues = CHARACTERISTIC_KEYS.map((k) => assigned[k]);
            expect(sortedAsc(assignedValues)).toEqual(sortedAsc(rolls));

            // Highest-to-scheme invariant: min scheme value >= max non-scheme value.
            const schemeSet = new Set(schemeChars);
            const schemeValues = CHARACTERISTIC_KEYS.filter((k) => schemeSet.has(k)).map(
              (k) => assigned[k],
            );
            const nonSchemeValues = CHARACTERISTIC_KEYS.filter((k) => !schemeSet.has(k)).map(
              (k) => assigned[k],
            );
            if (schemeValues.length > 0 && nonSchemeValues.length > 0) {
              expect(Math.min(...schemeValues)).toBeGreaterThanOrEqual(Math.max(...nonSchemeValues));
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('(b) generated character: min raw roll on scheme chars >= max raw roll on non-scheme chars, all raw rolls valid', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));
          const speciesMods = SPECIES_DATA[char.species].chars;
          const schemeChars = CAREER_SCHEMES[char.career].level1!.characteristics;
          const schemeSet = new Set(schemeChars);

          // Recover each characteristic's raw rolled value by stripping the species modifier.
          const rawRoll = {} as Record<CharacteristicKey, number>;
          for (const k of CHARACTERISTIC_KEYS) {
            rawRoll[k] = char.chars[k].i - speciesMods[k];
            // Each raw roll is a valid raw 2d10 value: an integer in [2, 20].
            expect(Number.isInteger(rawRoll[k])).toBe(true);
            expect(rawRoll[k]).toBeGreaterThanOrEqual(2);
            expect(rawRoll[k]).toBeLessThanOrEqual(20);
          }

          const schemeRaw = CHARACTERISTIC_KEYS.filter((k) => schemeSet.has(k)).map((k) => rawRoll[k]);
          const nonSchemeRaw = CHARACTERISTIC_KEYS.filter((k) => !schemeSet.has(k)).map(
            (k) => rawRoll[k],
          );

          // Core rearrange invariant: the smallest roll assigned to a scheme characteristic
          // is at least as large as the largest roll assigned to any non-scheme characteristic.
          if (schemeRaw.length > 0 && nonSchemeRaw.length > 0) {
            expect(Math.min(...schemeRaw)).toBeGreaterThanOrEqual(Math.max(...nonSchemeRaw));
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
