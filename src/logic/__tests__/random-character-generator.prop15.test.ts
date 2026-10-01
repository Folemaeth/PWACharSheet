import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { resolveTrapping } from '../trapping-resolver';
import { CLASS_TRAPPINGS } from '../../data/class-trappings';
import { CAREER_SCHEMES } from '../../data/careers';

/**
 * Feature: random-character-generator, Property 15 — Granted trappings resolve to
 * items present on the character
 *
 * **Validates: Requirements 11.1, 11.2**
 *
 * Design text (Algorithm Detail §10, Core p.36–37): granted career level-1 trappings
 * (Core p.36 "Career Trappings") and class trappings (Core p.37 "Class Trappings")
 * all resolve to items that end up on the character — routed into `weapons`,
 * `armour`, or `trappings`.
 *
 * Because " or " picks consume the RNG, re-resolving a granted entry with a fresh,
 * differently-advanced RNG cannot be expected to reproduce the character's exact
 * randomized picks. We therefore assert the WEAKER-but-correct invariants that match
 * the design intent (`resolveTrapping` always yields ≥1 item per entry):
 *   - the TOTAL count of weapons + armour + trappings on the character is ≥ the
 *     number of granted entries (each entry contributes ≥1 resolved item), and
 *   - every granted class-trappings entry independently resolves to ≥1 item, and
 *   - whenever there are granted entries, the character's combined gear is non-empty.
 *
 * Companion non-property assertion (Req 11.2 coverage): CLASS_TRAPPINGS is defined and
 * non-empty for every character's class, and all 8 Core p.37 classes are covered.
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

/** The 8 Core p.37 classes that must have a Class Trappings list (Req 11.2). */
const CORE_CLASSES = [
  'Academics',
  'Burghers',
  'Courtiers',
  'Peasants',
  'Rangers',
  'Riverfolk',
  'Rogues',
  'Warriors',
] as const;

describe('Feature: random-character-generator', () => {
  describe('Property 15 — Granted trappings resolve to items present on the character', () => {
    it('for any seed, every granted career + class trapping resolves to an item on the character', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // The granted entries = career level-1 trappings (Core p.36) + class
          // trappings (Core p.37), exactly as assembleGear collects them.
          const careerTrappings = CAREER_SCHEMES[char.career].level1?.trappings ?? [];
          const classTrappings = CLASS_TRAPPINGS[char.class];
          const grantedEntries = [...careerTrappings, ...classTrappings];

          // Req 11.2: the character's class must have a non-empty Class Trappings list.
          expect(classTrappings).toBeDefined();
          expect(classTrappings.length).toBeGreaterThan(0);

          // Each granted entry resolves to ≥1 item (Req 11.1), so the combined gear
          // count on the character must be ≥ the number of granted entries. Use an
          // independent, deterministic RNG for the re-resolution sanity check.
          const combinedGearCount =
            char.weapons.length + char.armour.length + char.trappings.length;
          expect(combinedGearCount).toBeGreaterThanOrEqual(grantedEntries.length);

          // Every class-trappings entry independently resolves to ≥1 item (Req 11.1/11.2).
          for (const entry of classTrappings) {
            const resolved = resolveTrapping(entry, mulberry32(seed >>> 0));
            expect(resolved.length).toBeGreaterThanOrEqual(1);
          }

          // Non-empty gear whenever there are granted entries (Req 11.1).
          if (grantedEntries.length > 0) {
            expect(combinedGearCount).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 },
      );
    });

    // Companion assertion (Req 11.2): all 8 Core p.37 classes have a non-empty
    // Class Trappings list. Deterministic coverage check in the same file.
    it('all 8 Core p.37 classes have a defined, non-empty Class Trappings list (Req 11.2)', () => {
      for (const className of CORE_CLASSES) {
        expect(CLASS_TRAPPINGS[className]).toBeDefined();
        expect(CLASS_TRAPPINGS[className].length).toBeGreaterThan(0);
      }
      // No stray/undocumented class keys beyond the 8 Core classes.
      expect(Object.keys(CLASS_TRAPPINGS).sort()).toEqual([...CORE_CLASSES].sort());
    });
  });
});
