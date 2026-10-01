import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { SPECIES_DATA } from '../../data/species';
import { CAREER_SCHEMES } from '../../data/careers';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible.
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

// Feature: random-character-generator, Property 2 — Well-formed identity

describe('Feature: random-character-generator', () => {
  describe('Property 2 — Well-formed identity', () => {
    /**
     * **Validates: Requirements 1.3, 1.4, 4.3**
     *
     * For any seed, the generated character has `_v === 8`; `species` is a defined
     * `SPECIES_DATA` key; `career` is a defined `CAREER_SCHEMES` key with a defined
     * `level1`; and `class === scheme.class`, `careerLevel === scheme.level1.title`,
     * `careerPath === career`, `status === scheme.level1.status` are all non-empty and
     * mutually consistent.
     */
    it('generates a well-formed, internally consistent identity for any seed', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          // Fresh mulberry32 RNG per generated seed.
          const char = generateRandomCharacter(mulberry32(seed));

          // Schema version (Req 1.3).
          expect(char._v).toBe(8);

          // Species is a defined SPECIES_DATA key (Req 1.4).
          expect(SPECIES_DATA[char.species]).toBeDefined();

          // Career is a defined CAREER_SCHEMES key with a defined level1 (Req 4.3).
          const scheme = CAREER_SCHEMES[char.career];
          expect(scheme).toBeDefined();
          expect(scheme.level1).toBeDefined();
          const level1 = scheme.level1!;

          // Identity fields mutually consistent with the scheme (Req 1.4, 4.3).
          expect(char.class).toBe(scheme.class);
          expect(char.careerLevel).toBe(level1.title);
          expect(char.careerPath).toBe(char.career);
          expect(char.status).toBe(level1.status);

          // All identity fields are non-empty.
          expect(char.species.length).toBeGreaterThan(0);
          expect(char.class.length).toBeGreaterThan(0);
          expect(char.career.length).toBeGreaterThan(0);
          expect(char.careerLevel.length).toBeGreaterThan(0);
          expect(char.careerPath.length).toBeGreaterThan(0);
          expect(char.status.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
