import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { resolveNamePool } from '../../data/character-names';

/**
 * Feature: random-character-generator, Property 19 — Name belongs to the species'
 * name pool
 *
 * **Validates: Requirements 2.1, 2.3**
 *
 * Design text: "the generated name belongs to the resolved name pool for the
 * character's species." The generator assigns `char.name` via
 * `pick(rng, resolveNamePool(species))`, so for any seed the resulting name must be a
 * member of `resolveNamePool(char.species)` and a non-empty string. `resolveNamePool`
 * always returns a non-empty pool (dedicated → normalised → FALLBACK_NAME_POOL), which
 * is what makes membership well-defined for every species key (Req 2.3). The name is
 * curated flavour with no mechanical effect (Req 2.4, 13.2).
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
  describe("Property 19 — Name belongs to the species' name pool", () => {
    it("for any seed, char.name is a non-empty string in resolveNamePool(char.species)", () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // Name must be a non-empty string (Req 2.1).
          expect(typeof char.name).toBe('string');
          expect(char.name.length).toBeGreaterThan(0);

          // Name must belong to the resolved pool for the character's species
          // (Req 2.1, 2.3). resolveNamePool is guaranteed non-empty.
          const pool = resolveNamePool(char.species);
          expect(pool.length).toBeGreaterThan(0);
          expect(pool).toContain(char.name);
        }),
        { numRuns: 100 },
      );
    });
  });
});
