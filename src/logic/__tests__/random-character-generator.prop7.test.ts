import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { CHARACTERISTIC_KEYS } from '../../types/character';
import { CAREER_SCHEMES } from '../../data/careers';

/**
 * Feature: random-character-generator, Property 7 — Characteristic advances are legal
 *
 * **Validates: Requirements 5.4, 5.5**
 *
 * Design text: "For any seed, the sum of chars[k].a over all characteristics is exactly 5,
 * and every characteristic with a > 0 is a member of the career's advance-scheme
 * characteristics."
 *
 * Core p.34: a creation character receives exactly 5 free characteristic Advances, and
 * those Advances may only be spent on the career's advance-scheme characteristics
 * (CAREER_SCHEMES[career].level1.characteristics).
 */

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible. A fresh RNG is built per seed so
 * each property run gets an independent, reproducible stream.
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
  describe('Property 7 — Characteristic advances are legal', () => {
    it('for any seed, advances sum to exactly 5 and only land on the career advance-scheme characteristics', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // The career's advance-scheme characteristics (Core p.34). The generator only
          // picks careers with a startable level-1 entry (Property 4), so level1 is defined.
          const level1 = CAREER_SCHEMES[char.career].level1;
          expect(level1).toBeDefined();
          const schemeChars = level1!.characteristics;

          // Req 5.4: exactly 5 characteristic advances total.
          const totalAdvances = CHARACTERISTIC_KEYS.reduce(
            (sum, k) => sum + char.chars[k].a,
            0,
          );
          expect(totalAdvances).toBe(5);

          // Req 5.5: every characteristic that received an advance must be a member of
          // the career's advance-scheme characteristics.
          for (const k of CHARACTERISTIC_KEYS) {
            if (char.chars[k].a > 0) {
              expect(schemeChars).toContain(k);
            }
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
