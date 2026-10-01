// Feature: random-character-generator, Property 1 — Determinism under a seeded RNG
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

/**
 * Property 1: Determinism under a seeded RNG
 *
 * **Validates: Requirements 1.5**
 *
 * For any seed, invoking `generateRandomCharacter` twice with freshly-seeded RNGs
 * built from that seed produces two deeply-equal `Character` objects.
 */

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

describe('Property 1 — Determinism under a seeded RNG (Req 1.5)', () => {
  it('produces deeply-equal characters from two freshly-seeded RNGs for any seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
        // Two independent RNGs seeded identically — the generator must not depend on
        // any shared or global state, so both runs must produce identical output.
        const first = generateRandomCharacter(mulberry32(seed));
        const second = generateRandomCharacter(mulberry32(seed));
        expect(second).toEqual(first);
      }),
      { numRuns: 100 },
    );
  });
});
