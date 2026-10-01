import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

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

// Feature: random-character-generator, Property 14 — Bonus XP is 95 and unspent.

describe('Feature: random-character-generator', () => {
  describe('Property 14 — Bonus XP is 95 and unspent', () => {
    /**
     * **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
     *
     * Random character creation grants Bonus XP from the three randomised steps and
     * leaves all of it unspent:
     *   - +20 XP for a randomly determined Species (Core p.24),
     *   - +25 XP for a randomly rearranged / rolled-in-order set of characteristics (Core p.33),
     *   - +50 XP for a randomly determined Career (Core p.30–31; confirmed interpretation).
     * Total = 20 + 25 + 50 = 95 Bonus XP, none of which is spent by the generator.
     *
     * Therefore, for every generated character, regardless of seed:
     *   - `xpCur` (available/current XP) === 95 (Req 10.1, 10.2, 10.3),
     *   - `xpTotal` (lifetime XP) === 95 (Req 10.1, 10.2, 10.3),
     *   - `xpSpent` === 0 (Bonus XP is left unspent — Req 10.4).
     */
    it('every generated character has xpCur === 95, xpTotal === 95, xpSpent === 0', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // 20 (species, Core p.24) + 25 (char rearrange, Core p.33)
          // + 50 (career, Core p.30–31) = 95 Bonus XP, left unspent.
          expect(char.xpCur).toBe(95);
          expect(char.xpTotal).toBe(95);
          expect(char.xpSpent).toBe(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
