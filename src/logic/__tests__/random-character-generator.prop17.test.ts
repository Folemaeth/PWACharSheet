import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { resolveTrapping, AMBIGUOUS_MAP } from '../trapping-resolver';
import { WEAPONS } from '../../data/weapons';
import { ARMOURS } from '../../data/armour';

/**
 * Feature: random-character-generator, Property 17 — Resolved weapons and armour
 * carry full stat blocks
 *
 * **Validates: Requirements 11.5, 11.6, 11.7**
 *
 * Design text (resolveTrapping + Algorithm Detail §10, Core p.36–37): a resolved item
 * whose name matches an exact WEAPONS entry carries the FULL weapon stat block (group,
 * enc, reach/range, damage, qualities); an item matching an exact ARMOURS entry carries
 * the FULL armour stat block (locations, enc, ap, qualities, armourType); any other
 * (unknown) name is stored as a named trapping with quantity ≥ 1.
 *
 * This file implements Property 17 as a SINGLE property (≥100 iterations) covering all
 * three routing branches, plus a companion generated-character assertion that every
 * item placed on a character's `weapons` / `armour` lists deep-equals its data source.
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

/**
 * A name routes straight to the exact WEAPONS/ARMOURS lookup only when it does NOT
 * trigger an earlier branch in the resolver's resolution order:
 *   - a " and " / " or " token triggers the split branches (a few Core ammo names
 *     such as "Scrap and Powder" / "Bullet and Powder" legitimately contain " and "),
 *   - an AMBIGUOUS_MAP whole-string key is normalised before the exact lookup.
 * Property 17's exact-stat-block claim is about the direct-match branch, so constrain
 * the generator pools to names that reach it unmodified.
 */
function routesToExactMatch(name: string): boolean {
  if (name.includes(' and ') || name.includes(' or ')) return false;
  if (Object.prototype.hasOwnProperty.call(AMBIGUOUS_MAP, name)) return false;
  return true;
}

const WEAPON_NAMES = WEAPONS.map((w) => w.name).filter(routesToExactMatch);
const ARMOUR_NAMES = ARMOURS.map((a) => a.name).filter(routesToExactMatch);

/** Lookup maps so the companion check can deep-equal an item against its source. */
const WEAPON_BY_NAME = new Map(WEAPONS.map((w) => [w.name, w]));
const ARMOUR_BY_NAME = new Map(ARMOURS.map((a) => [a.name, a]));

/**
 * Set of all names that are "known" to the resolver and would NOT fall through to the
 * named-trapping fallback: exact weapon/armour names and every AMBIGUOUS_MAP key (which
 * normalises to a concrete item). Used to filter fast-check strings down to genuinely
 * unknown names (Req 11.7).
 */
const KNOWN_NAMES = new Set<string>([
  ...WEAPON_NAMES,
  ...ARMOUR_NAMES,
  ...Object.keys(AMBIGUOUS_MAP),
]);

/** True when a generated string is a safe "unknown" input for the fallback branch. */
function isUnknownName(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  // " and " / " or " trigger the split branches, not the single-part fallback.
  if (t.includes(' and ') || t.includes(' or ')) return false;
  // A leading quantity phrase ("10 arrows") is still a named trapping, but to keep the
  // assertion crisp (quantity === 1) exclude a leading digit run.
  if (/^\d/.test(t)) return false;
  // Must not resolve to a weapon/armour or a mapped concrete item.
  if (KNOWN_NAMES.has(t)) return false;
  return true;
}

describe('Feature: random-character-generator', () => {
  describe('Property 17 — Resolved weapons and armour carry full stat blocks', () => {
    it('resolves exact weapon/armour names to full stat blocks and unknown names to named trappings (quantity ≥ 1)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xffffffff }),
          fc.constantFrom(...WEAPON_NAMES),
          fc.constantFrom(...ARMOUR_NAMES),
          fc.string(),
          (seed, weaponName, armourName, rawUnknown) => {
            // --- WEAPONS branch (Req 11.5): exact name → full weapon stat block ---
            const weaponResolved = resolveTrapping(weaponName, mulberry32(seed >>> 0));
            expect(weaponResolved.length).toBe(1);
            const w = weaponResolved[0];
            expect(w.kind).toBe('weapon');
            if (w.kind === 'weapon') {
              // Deep-equals the WEAPONS source: group, enc, reach/range, damage, qualities.
              expect(w.item).toEqual(WEAPON_BY_NAME.get(weaponName));
            }

            // --- ARMOURS branch (Req 11.6): exact name → full armour stat block ---
            const armourResolved = resolveTrapping(armourName, mulberry32(seed >>> 0));
            expect(armourResolved.length).toBe(1);
            const a = armourResolved[0];
            expect(a.kind).toBe('armour');
            if (a.kind === 'armour') {
              // Deep-equals the ARMOURS source: locations, enc, ap, qualities, armourType.
              expect(a.item).toEqual(ARMOUR_BY_NAME.get(armourName));
            }

            // --- Fallback branch (Req 11.7): unknown name → named trapping, quantity ≥ 1 ---
            if (isUnknownName(rawUnknown)) {
              const name = rawUnknown.trim();
              const trappingResolved = resolveTrapping(name, mulberry32(seed >>> 0));
              expect(trappingResolved.length).toBe(1);
              const t = trappingResolved[0];
              expect(t.kind).toBe('trapping');
              if (t.kind === 'trapping') {
                expect(t.item.name).toBe(name);
                expect(t.item.quantity).toBeGreaterThanOrEqual(1);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('every weapon/armour item on a generated character deep-equals its data source (full stat blocks present)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // Req 11.5: each equipped weapon carries the full WEAPONS stat block.
          for (const item of char.weapons) {
            const source = WEAPON_BY_NAME.get(item.name);
            expect(source).toBeDefined();
            // Resolver copies only the WEAPONS fields; the item must deep-equal the source.
            // (A generated weapon never gains extra fields beyond the stat block here.)
            expect(item).toEqual(source);
          }

          // Req 11.6: each armour piece carries the full ARMOURS stat block.
          for (const item of char.armour) {
            const source = ARMOUR_BY_NAME.get(item.name);
            expect(source).toBeDefined();
            expect(item).toEqual(source);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
