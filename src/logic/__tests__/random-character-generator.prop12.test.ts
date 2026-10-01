import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { pickCareerTalent, generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { BLANK_CHARACTER } from '../../types/character';
import { CAREER_SCHEMES } from '../../data/careers';

/**
 * Feature: random-character-generator, Property 12 — Exactly one career talent is chosen
 *
 * **Validates: Requirements 8.3**
 *
 * Design text: "For any seed, exactly one of the four level-1 career talents appears on
 * char.talents."
 *
 * Core p.35: a creation character selects exactly ONE of the four level-1 career talents.
 *
 * Isolation note: a species talent can, in principle, share a name with a career talent,
 * so counting matches of the four career talents on a fully-generated character is not an
 * exact test of the career-talent STEP. The cleanest isolation is to exercise the exported
 * `pickCareerTalent` helper directly on a fresh `structuredClone(BLANK_CHARACTER)` (which has
 * no talents), so exactly the talents the career step adds are present. We then add a
 * generator-level sanity check that at least one of the four career talents is present on a
 * fully-built character (accounting for species-talent name overlap, the career-chosen one is
 * among them).
 */

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * Returns a float in [0, 1), Math.random-compatible. A fresh RNG is built per seed so each
 * property run gets an independent, reproducible stream.
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

/** All careers that have a startable level-1 entry with a non-empty talents list. */
const CAREERS_WITH_LEVEL1_TALENTS = Object.keys(CAREER_SCHEMES).filter(
  (career) => (CAREER_SCHEMES[career].level1?.talents?.length ?? 0) > 0,
);

describe('Feature: random-character-generator', () => {
  describe('Property 12 — Exactly one career talent is chosen', () => {
    it('for any career and seed, pickCareerTalent adds exactly one of the four level-1 career talents on a blank character', () => {
      // Sanity: the fixture must actually have careers to exercise.
      expect(CAREERS_WITH_LEVEL1_TALENTS.length).toBeGreaterThan(0);

      fc.assert(
        fc.property(
          fc.constantFrom(...CAREERS_WITH_LEVEL1_TALENTS),
          fc.integer({ min: 0, max: 0xffffffff }),
          (career, seed) => {
            const careerTalents = CAREER_SCHEMES[career].level1!.talents;

            // Isolate the career-talent step: a fresh blank clone has NO talents, so after
            // pickCareerTalent the only talent present is the one the step chose.
            const char = structuredClone(BLANK_CHARACTER);
            pickCareerTalent(mulberry32(seed >>> 0), char, careerTalents);

            // Core p.35 / Req 8.3: exactly one talent was added by the career step...
            expect(char.talents).toHaveLength(1);
            // ...and it is one of the four level-1 career talents.
            expect(careerTalents).toContain(char.talents[0].n);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('for any seed, a fully-generated character has at least one of its career level-1 talents present', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // The generator only picks careers with a startable level-1 entry (Property 4),
          // so level1 is defined.
          const level1 = CAREER_SCHEMES[char.career].level1;
          expect(level1).toBeDefined();
          const careerTalents = level1!.talents;

          // Count how many of the four level-1 career talents appear on the character.
          // Because a species talent could coincidentally share a name with a career talent,
          // the total count may exceed one; what Req 8.3 guarantees is that the career step
          // DID add one of the four, i.e. at least one of them is present.
          const presentNames = new Set(char.talents.map((t) => t.n));
          const matchCount = careerTalents.filter((t) => presentNames.has(t)).length;
          expect(matchCount).toBeGreaterThanOrEqual(1);
        }),
        { numRuns: 100 },
      );
    });
  });
});
