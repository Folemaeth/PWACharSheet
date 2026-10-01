import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  generateRandomCharacter,
  distributeCareerSkillAdvances,
} from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { CAREER_SCHEMES } from '../../data/careers';
import { careerSkillMatches } from '../advancement';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * A fresh instance is built per seed so each run gets an independent,
 * reproducible stream.
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

/** Career keys whose scheme has a defined level-1 entry (the startable careers). */
const CAREERS_WITH_LEVEL1 = Object.keys(CAREER_SCHEMES).filter(
  (c) => CAREER_SCHEMES[c]?.level1,
);

/**
 * A career skill is a WILDCARD when it needs a player-chosen specialisation —
 * marked `(Any)` or `(Any X)`. This matches exactly how `ensureCareerSkillsExist`
 * decides which career skills to materialise, so a non-wildcard skill is one the
 * generator must guarantee exists after allocation (Core p.35; Req 8.4).
 */
function isWildcard(careerSkill: string): boolean {
  return careerSkill.includes('(Any)') || careerSkill.includes('(Any ');
}

/**
 * Reconstruct the CAREER advances applied to each of a career's level-1 skills by
 * diffing the character's skills against a fresh blank baseline. `pickSpeciesSkills`
 * is NOT run here, so every advance present is the career step's contribution. A
 * Basic entry started at a=0, so its current `a` IS the applied advance; a pushed
 * Advanced entry likewise.
 *
 * Attribution is per PHYSICAL character skill, counted exactly once. Some careers
 * list a wildcard `(Any)` skill alongside a concrete sibling of the same group
 * (e.g. "Melee (Any)" + "Melee (Brawling)" on Pit Fighter, or "Lore (Any)" +
 * "Lore (Heraldry)" on Knight of the Blazing Sun — Up In Arms). The shared
 * `careerSkillMatches` helper treats a `(Any)` career skill as matching those
 * concrete siblings, so a naive "sum every matching advance per career skill"
 * double-counts the concrete skill's advances. To mirror the generator's actual
 * allocation (which applies advances to each career-skill entry once), each
 * character skill is attributed to a single career skill, preferring an EXACT /
 * concrete (non-wildcard) match over a wildcard `(Any)` match.
 */
function isWildcardSkill(name: string): boolean {
  return name.includes('(Any)') || name.includes('(Any ');
}

function careerSkillAdvances(
  char: Character,
  careerSkills: string[],
): Map<string, number> {
  const all = [...char.bSkills, ...char.aSkills];
  const result = new Map<string, number>(careerSkills.map((cs) => [cs, 0]));

  for (const s of all) {
    if (s.a <= 0) continue;
    const matches = careerSkills.filter((cs) => careerSkillMatches(cs, s.n));
    if (matches.length === 0) continue;
    // Prefer the most specific career skill: an exact name match first, then any
    // non-wildcard match, then fall back to a wildcard. This counts each physical
    // skill's advances exactly once.
    const best =
      matches.find((cs) => cs === s.n) ??
      matches.find((cs) => !isWildcardSkill(cs)) ??
      matches[0];
    result.set(best, (result.get(best) ?? 0) + s.a);
  }

  return result;
}

// Feature: random-character-generator, Property 11 — Career skill advances are
// legal and complete.

describe('Feature: random-character-generator', () => {
  describe('Property 11 — Career skill advances are legal and complete', () => {
    /**
     * **Validates: Requirements 8.1, 8.2, 8.4**
     *
     * For any seed, the advances applied across the eight level-1 career skills sum
     * to exactly 40 with no single career skill receiving more than 10 (Core p.35),
     * and every non-wildcard level-1 career skill exists on the character after
     * allocation (Req 8.4).
     *
     * Tested on the PURE helper `distributeCareerSkillAdvances` over a fresh
     * `structuredClone(BLANK_CHARACTER)` so the only advances present are the career
     * step's — the species step (which can touch the same skill names) does NOT run,
     * isolating the career contribution. Driven over every startable career and a
     * seed (≥100 runs). All Core careers list exactly 8 level-1 skills, so the +5×8
     * = 40 allocation (sum 40, max 5 ≤ 10) always applies.
     */
    it('career advances sum to 40, none exceed 10, and every non-wildcard career skill exists after allocation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...CAREERS_WITH_LEVEL1),
          fc.integer({ min: 0, max: 0xffffffff }),
          (career, _seed) => {
            const level1 = CAREER_SCHEMES[career].level1!;
            const careerSkills = level1.skills;

            const char = structuredClone(BLANK_CHARACTER);
            const after = distributeCareerSkillAdvances(char, careerSkills);

            const applied = careerSkillAdvances(after, careerSkills);

            // Sum of advances across the career skills is exactly 40 (Req 8.1).
            let total = 0;
            for (const a of applied.values()) total += a;
            expect(total).toBe(40);

            // No single career skill receives more than 10 advances (Req 8.2).
            for (const a of applied.values()) {
              expect(a).toBeLessThanOrEqual(10);
            }

            // Every non-wildcard level-1 career skill exists on the character after
            // allocation (Req 8.4). A wildcard `(Any)` skill is intentionally left for
            // the player to specialise, so it is excluded from this check — matching
            // `ensureCareerSkillsExist`.
            const allAfter = [...after.bSkills, ...after.aSkills];
            for (const cs of careerSkills) {
              if (isWildcard(cs)) continue;
              const exists = allAfter.some((s) => careerSkillMatches(cs, s.n));
              expect(exists).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Generator-level sanity check (Req 8.4): on a FULLY generated character — where
     * the species skill step has also run and may add advances to the same skill
     * names — every non-wildcard level-1 career skill still exists on the character.
     * This confirms the career-skill materialisation composes correctly with the rest
     * of the build.
     */
    it('a fully generated character has every non-wildcard level-1 career skill present', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          const level1 = CAREER_SCHEMES[char.career].level1!;
          const allSkills = [...char.bSkills, ...char.aSkills];

          for (const cs of level1.skills) {
            if (isWildcard(cs)) continue;
            const exists = allSkills.some((s) => careerSkillMatches(cs, s.n));
            expect(exists).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
