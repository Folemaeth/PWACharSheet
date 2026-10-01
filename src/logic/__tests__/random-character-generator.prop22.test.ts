import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import {
  getSpeciesGroup,
  getHairColourOptions,
  getEyeColourOptions,
} from '../personal-details';
import { DWARF_ALTERNATE_TABLE } from '../../data/personal-details';
import { resolveFeaturePool } from '../../data/distinguishing-features';

/**
 * Feature: random-character-generator, Property 22 — Personal details are populated
 * and race-appropriate
 *
 * **Validates: Requirements 16.1, 16.2, 16.4, 16.5, 16.6**
 *
 * Design text: the generator always maps to a Core species that has a defined
 * `SpeciesGroup`, so `buildPersonalDetails` never hits the undefined-group early return.
 * Therefore, for any seed, every generated character has fully populated,
 * race-appropriate personal details:
 *   - `age` is a non-empty string parsing to a positive integer (Req 16.1).
 *   - `height` is a non-empty `feet'inches"` string (Req 16.1).
 *   - `hair` is a member of the species group's hair-colour options (Req 16.1).
 *   - `eyes` is a member of the species group's eye-colour options, or — for
 *     High/Wood Elves — a variegated "X flecked with Y" where both parts are members
 *     (Req 16.4).
 *   - `distinguishingFeature` is a non-empty string: for Dwarves a member of the
 *     official d100 alternate table's feature set (dwarfguide p.40), for non-Dwarves a
 *     member of the curated feature pool (Req 16.5, 16.6).
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
  describe('Property 22 — Personal details are populated and race-appropriate', () => {
    it('for any seed, age/height/hair/eyes/feature are populated and race-appropriate', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // The generator always maps to a Core species with a defined SpeciesGroup,
          // so personal details must never be left blank (Req 16.2).
          const group = getSpeciesGroup(char.species);
          expect(group).toBeDefined();

          // --- Age: non-empty string parsing to a positive integer (Req 16.1) ---
          expect(typeof char.age).toBe('string');
          expect(char.age.length).toBeGreaterThan(0);
          const age = Number(char.age);
          expect(Number.isInteger(age)).toBe(true);
          expect(age).toBeGreaterThan(0);

          // --- Height: non-empty feet'inches" string (Req 16.1) ---
          expect(typeof char.height).toBe('string');
          expect(char.height.length).toBeGreaterThan(0);
          expect(char.height).toMatch(/^\d+'\d+"$/);

          // --- Hair: member of the species group's hair-colour options (Req 16.1) ---
          expect(typeof char.hair).toBe('string');
          expect(char.hair.length).toBeGreaterThan(0);
          const hairOptions = getHairColourOptions(group!);
          expect(hairOptions).toContain(char.hair);

          // --- Eyes: member of eye-colour options, or variegated for elves (Req 16.4) ---
          expect(typeof char.eyes).toBe('string');
          expect(char.eyes.length).toBeGreaterThan(0);
          const eyeOptions = getEyeColourOptions(group!);
          const isElf = group === 'High_Elf' || group === 'Wood_Elf';
          const directMatch = eyeOptions.includes(char.eyes);
          let variegatedMatch = false;
          if (isElf && char.eyes.includes(' flecked with ')) {
            const [first, second] = char.eyes.split(' flecked with ');
            variegatedMatch =
              eyeOptions.includes(first) && eyeOptions.includes(second);
          }
          expect(directMatch || variegatedMatch).toBe(true);

          // --- Distinguishing feature: non-empty, race-appropriate (Req 16.5, 16.6) ---
          // `distinguishingFeature` is optional on Character; the generator always
          // populates it here, so narrow to a defined non-empty string first.
          const feature = char.distinguishingFeature;
          expect(typeof feature).toBe('string');
          expect((feature ?? '').length).toBeGreaterThan(0);
          if (group === 'Dwarf') {
            // Dwarf features come from the official d100 alternate table (dwarfguide p.40).
            const dwarfFeatures = DWARF_ALTERNATE_TABLE.map((r) => r.feature);
            expect(dwarfFeatures).toContain(feature);
          } else {
            // Non-Dwarf features come from the curated feature pool for the group.
            const featurePool = resolveFeaturePool(group!);
            expect(featurePool).toContain(feature);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
