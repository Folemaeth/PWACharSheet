import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
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

// Feature: random-character-generator, Property 13 — Derived Fate/Resilience and Movement.

describe('Feature: random-character-generator', () => {
  describe('Property 13 — Derived Fate/Resilience and Movement', () => {
    /**
     * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
     *
     * For any seed, the derived attributes follow Core p.33–34 and the confirmed
     * Extra-Points split:
     *  - Fate = speciesBaseFate + floor(extraPoints / 2); Fortune = Fate.
     *  - Resilience = speciesBaseResilience + (extraPoints − floor(extraPoints / 2));
     *    Resolve = Resilience.
     *  - The split consumes exactly all extra points:
     *    (fate − baseFate) + (resilience − baseResilience) === extraPoints.
     *  - Movement: m = species move, w = 2×m, r = 4×m.
     *  - woundsUseSB and speciesExtraPoints copied verbatim from the species data.
     */
    it('derives Fate/Fortune, Resilience/Resolve, Movement, woundsUseSB and speciesExtraPoints per the species data', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));
          const d = SPECIES_DATA[char.species];

          const fateExtra = Math.floor(d.extraPoints / 2);
          const resilienceExtra = d.extraPoints - fateExtra;

          // Fate / Fortune (Req 9.1, 9.2).
          expect(char.fate).toBe(d.fate + fateExtra);
          expect(char.fortune).toBe(char.fate);

          // Resilience / Resolve (Req 9.3, 9.4).
          expect(char.resilience).toBe(d.resilience + resilienceExtra);
          expect(char.resolve).toBe(char.resilience);

          // All extra points consumed by the split (Req 9.1/9.3).
          expect((char.fate - d.fate) + (char.resilience - d.resilience)).toBe(d.extraPoints);

          // Movement: Walk = 2×Move, Run = 4×Move (Req 9.5).
          expect(char.move.m).toBe(d.move);
          expect(char.move.w).toBe(d.move * 2);
          expect(char.move.r).toBe(d.move * 4);

          // woundsUseSB and speciesExtraPoints copied verbatim (Req 9.6).
          expect(char.woundsUseSB).toBe(d.woundsUseSB);
          expect(char.speciesExtraPoints).toBe(d.extraPoints);
        }),
        { numRuns: 100 },
      );
    });
  });
});
