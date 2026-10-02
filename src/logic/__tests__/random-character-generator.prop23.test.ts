import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

/**
 * Feature: random-character-generator, Property 23 — Personal details are
 * deterministic under a seeded RNG
 *
 * **Validates: Requirements 16.8, 16.9**
 *
 * Design text: "For any seed, two generations with freshly-seeded RNGs built from that
 * seed produce identical `age`, `height`, `hair`, `eyes`, and `distinguishingFeature`
 * (a consequence of Property 1, asserted explicitly for the personal-details fields)."
 *
 * Determinism (Req 16.8) holds only if every roll in `buildPersonalDetails` is drawn
 * from the injectable RNG seam and never from `Math.random` (Req 16.9) — otherwise the
 * two independently-seeded runs would diverge on at least one personal-details field.
 * Asserting field-for-field equality across many seeds is therefore a direct check that
 * all personal-details randomness is routed through the seam.
 */

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible. A fresh instance is built per
 * seed so each property run gets an independent, reproducible stream.
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
  describe('Property 23 — Personal details are deterministic under a seeded RNG', () => {
    it('for any seed, two freshly-seeded generations yield identical personal details', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          // Two independent runs from the SAME seed, each with a fresh RNG stream.
          const charA = generateRandomCharacter(mulberry32(seed >>> 0));
          const charB = generateRandomCharacter(mulberry32(seed >>> 0));

          // Every personal-details field must match exactly (Req 16.8, 16.9).
          expect(charA.age).toBe(charB.age);
          expect(charA.height).toBe(charB.height);
          expect(charA.hair).toBe(charB.hair);
          expect(charA.eyes).toBe(charB.eyes);
          expect(charA.distinguishingFeature).toBe(charB.distinguishingFeature);
          expect(charA.sex).toBe(charB.sex);
        }),
        { numRuns: 100 },
      );
    });
  });
});
