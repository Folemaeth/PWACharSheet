import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateRandomCharacter,
  resolveSpeciesTalents,
} from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { BLANK_CHARACTER } from '../../types/character';
import { SPECIES_DATA, SPECIES_OPTIONS } from '../../data/species';
import { CAREER_SCHEMES } from '../../data/careers';
import { RANDOM_TALENT_TABLE } from '../../data/randomTalents';

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

/** The full set of valid Random Talent table results (Core p.35 random slots). */
const VALID_RANDOM_TALENTS = new Set(RANDOM_TALENT_TABLE.map((e) => e.talent));

// Feature: random-character-generator, Property 10 — Species talents resolved with
// unique results.

describe('Feature: random-character-generator', () => {
  describe('Property 10 — Species talents resolved with unique results', () => {
    /**
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
     *
     * For any seed, `resolveSpeciesTalents` applied to a blank character:
     *  - grants every fixed (non-"A or B") species talent by name (Req 7.1);
     *  - resolves every "A or B" entry to exactly one of its options (Req 7.2);
     *  - adds exactly `randomTalentSlots` random talents, each a valid Random Talent
     *    table result (Req 7.3);
     *  - leaves all talent names distinct — duplicate random rolls are rerolled (Req 7.4).
     *
     * `resolveSpeciesTalents` is exercised directly on a fresh BLANK_CHARACTER clone so the
     * species-talent contribution is isolated from the career talent (task 8); this makes the
     * random-slot count exact.
     */
    it('fixed talents present, each "A or B" resolved, exact random-slot count from the valid table, all names distinct', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SPECIES_OPTIONS),
          fc.integer({ min: 0, max: 0xffffffff }),
          (speciesKey, seed) => {
            const char = structuredClone(BLANK_CHARACTER);
            resolveSpeciesTalents(mulberry32(seed >>> 0), char, speciesKey);

            const data = SPECIES_DATA[speciesKey];
            const entries = data.talents ?? [];
            const slots = data.randomTalentSlots ?? 0;

            const names = char.talents.map((t) => t.n);
            const nameSet = new Set(names);

            // All talent names are distinct (Req 7.4): no duplicate rolls survive.
            expect(nameSet.size).toBe(names.length);

            // Partition the species entries into fixed talents and "A or B" choices.
            const fixedEntries = entries.filter((e) => !e.includes(' or '));
            const choiceEntries = entries.filter((e) => e.includes(' or '));

            // Every fixed talent is present by name (Req 7.1).
            for (const fixed of fixedEntries) {
              expect(nameSet.has(fixed)).toBe(true);
            }

            // Every "A or B" entry resolves to at least one of its options (Req 7.2).
            // (It can be exactly one, or — legally — both, when a random slot independently
            //  rolls the *other* option name. The total-count identity below pins the choice
            //  to exactly one talent regardless; a random slot producing an option name is a
            //  valid Random Talent result, not a second resolution of the choice.)
            for (const choice of choiceEntries) {
              const options = choice.split(' or ').map((o) => o.trim());
              const present = options.filter((o) => nameSet.has(o));
              expect(present.length).toBeGreaterThanOrEqual(1);
            }

            // Count the random talents exactly via the total-count identity. Each fixed entry
            // grants one talent and each "A or B" entry grants exactly one chosen talent, so:
            //   randomCount = total − fixedEntries − choiceEntries
            // which must equal `randomTalentSlots` (Req 7.3). Because the generator rerolls
            // duplicates (Req 7.4) and all names are distinct (asserted above), this subtraction
            // is exact even when a random slot shares a name with an unchosen choice option.
            const randomCount =
              names.length - fixedEntries.length - choiceEntries.length;
            expect(randomCount).toBe(slots);

            // Total count is consistent: fixed + one-per-choice + random slots (Req 7.3).
            expect(names.length).toBe(
              fixedEntries.length + choiceEntries.length + slots,
            );

            // Every talent name is explainable as a fixed species talent, a species "A or B"
            // option, or a valid Random Talent table result — no invented talents (Req 7.1–7.3).
            const choiceOptionNames = new Set<string>();
            for (const choice of choiceEntries) {
              for (const o of choice.split(' or ').map((x) => x.trim())) {
                choiceOptionNames.add(o);
              }
            }
            const fixedSet = new Set(fixedEntries);
            for (const n of names) {
              const legal =
                fixedSet.has(n) ||
                choiceOptionNames.has(n) ||
                VALID_RANDOM_TALENTS.has(n);
              expect(legal).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * End-to-end cross-check: a fully generated character also carries the single career
     * talent (task 8), so its full talent list must still have all distinct names (Req 7.4),
     * and every talent name must be explainable as a fixed species talent, a species "A or B"
     * option, a valid Random Talent table result, or a level-1 career talent. This confirms
     * the species-talent resolution composes correctly with the rest of the build.
     *
     * Note: a random-slot result can legitimately share a name with an *unchosen* "A or B"
     * option (e.g. "Savvy or Suave" → chose "Suave", random slot rolled "Savvy"), so random
     * talents are not attributed by subtracting option names. Instead each talent name is
     * matched against the union of all legal sources, and the random-slot count is verified
     * exactly in the first (isolated) test above.
     */
    it('a fully generated character has distinct talent names, each explainable by a legal source', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          const names = char.talents.map((t) => t.n);
          const nameSet = new Set(names);

          // All talent names distinct across the whole character (Req 7.4).
          expect(nameSet.size).toBe(names.length);

          const data = SPECIES_DATA[char.species];
          const entries = data.talents ?? [];

          // The union of every legal talent source for this character:
          //  - fixed species talents (Req 7.1),
          //  - every option of each species "A or B" entry (one is chosen; Req 7.2),
          //  - every valid Random Talent table result (random slots; Req 7.3),
          //  - the level-1 career talents (exactly one is chosen; task 8).
          const legalSources = new Set<string>(VALID_RANDOM_TALENTS);
          for (const entry of entries) {
            if (entry.includes(' or ')) {
              for (const o of entry.split(' or ').map((x) => x.trim())) {
                legalSources.add(o);
              }
            } else {
              legalSources.add(entry);
            }
          }
          const careerTalents = CAREER_SCHEMES[char.career]?.level1?.talents ?? [];
          for (const t of careerTalents) legalSources.add(t);

          // Every talent on the character traces to a legal source — no invented talents.
          for (const n of names) {
            expect(legalSources.has(n)).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
