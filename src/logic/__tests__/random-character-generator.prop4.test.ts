import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { getEligibleCareers } from '../career-eligibility';
import { CAREER_SCHEMES } from '../../data/careers';

/**
 * Feature: random-character-generator, Property 4 — Career is eligible and startable
 *
 * **Validates: Requirements 4.1, 4.2**
 *
 * Design text: "For any seed, career ∈ getEligibleCareers(species) and
 * CAREER_SCHEMES[career].level1 is defined."
 *
 * Req 4.1 — the generator selects the career from `getEligibleCareers(species)`.
 * Req 4.2 — the selected career's Career_Scheme has a defined level-1 entry
 * (High-Elf elite careers that start at level 2 are therefore never picked).
 */

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible. A fresh RNG is built per seed.
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

describe('Feature: random-character-generator', () => {
  describe('Property 4 — Career is eligible and startable', () => {
    it('for any seed, career is in getEligibleCareers(species) and has a defined level1', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed));

          // Req 4.1: the career must be one the species is allowed to take.
          const eligible = getEligibleCareers(char.species);
          expect(eligible).toContain(char.career);

          // Req 4.2: the selected career must have a defined level-1 entry
          // (startable at creation).
          expect(CAREER_SCHEMES[char.career]).toBeDefined();
          expect(CAREER_SCHEMES[char.career].level1).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });
  });
});
