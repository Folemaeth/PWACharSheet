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

// Feature: random-character-generator, Property 9 — Species lists are copied verbatim.

describe('Feature: random-character-generator', () => {
  describe('Property 9 — Species lists are copied verbatim', () => {
    /**
     * **Validates: Requirements 6.4, 7.5**
     *
     * For any seed, `char.speciesSkills` equals `SPECIES_DATA[species].skills` and
     * `char.speciesTalents` equals `SPECIES_DATA[species].talents` (Core p.35; Design §5/§6).
     * The generator records the species' full skill and talent lists verbatim on the
     * character so the sheet can present the species' choices.
     */
    it('char.speciesSkills and char.speciesTalents equal the species data lists verbatim', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));
          const speciesData = SPECIES_DATA[char.species];

          expect(char.speciesSkills).toEqual(speciesData.skills);
          expect(char.speciesTalents).toEqual(speciesData.talents);
        }),
        { numRuns: 100 },
      );
    });
  });
});
