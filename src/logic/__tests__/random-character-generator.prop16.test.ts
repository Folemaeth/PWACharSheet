import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { RNG } from '../random-character-generator';
import { resolveTrapping, AMBIGUOUS_MAP, type ResolvedTrapping } from '../trapping-resolver';
import { WEAPONS } from '../../data/weapons';
import { ARMOURS } from '../../data/armour';

/**
 * Feature: random-character-generator, Property 16 — Ambiguous and generic trappings
 * resolve to a single concrete item
 *
 * **Validates: Requirements 11.3, 11.4**
 *
 * Design text (Property 16, Core p.36–37): for any `"A or B"` entry the resolver
 * yields exactly ONE chosen option's resolution, and for every entry in
 * `AMBIGUOUS_MAP` the resolver returns the mapped concrete item as the correct
 * `weapon` / `armour` / `trapping` kind.
 *
 * Resolution rules under test (`resolveTrapping`, Core p.36 "Career Trappings" /
 * p.37 "Class Trappings"):
 *   - A single-item AMBIGUOUS_MAP key resolves to exactly one ResolvedTrapping whose
 *     resolved name equals AMBIGUOUS_MAP[key]. For a mapped target that exists in
 *     WEAPONS it is a `weapon` (item.name === target); in ARMOURS an `armour`
 *     (item.name === target); otherwise a named `trapping` (item.name === target).
 *   - An `"A or B"` entry resolves to exactly ONE item regardless of seed, and that
 *     item is the resolution of one of the two options.
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

/** Expected routed kind for a concrete item name, matching resolveTrapping's order. */
function expectedKind(name: string): ResolvedTrapping['kind'] {
  if (WEAPONS.some((w) => w.name === name)) return 'weapon';
  if (ARMOURS.some((a) => a.name === name)) return 'armour';
  return 'trapping';
}

/** The resolved item's display name regardless of its kind. */
function resolvedName(r: ResolvedTrapping): string {
  return r.item.name;
}

/** The single-item AMBIGUOUS_MAP keys (every map entry is a 1→1 mapping). */
const AMBIGUOUS_KEYS = Object.keys(AMBIGUOUS_MAP);

/**
 * Representative `"A or B"` entries (Core p.36 grants use this form). Each option
 * resolves through the normal resolveTrapping pipeline, so the set of acceptable
 * resolved names is the resolution of each option independently.
 */
const OR_ENTRIES = ['Dagger or Hand Weapon', 'Leather Jack or Dagger', 'Hand Weapon or Trade Tools'];

describe('Feature: random-character-generator', () => {
  describe('Property 16 — Ambiguous and generic trappings resolve to a single concrete item', () => {
    it('every AMBIGUOUS_MAP key resolves to exactly one concrete mapped item of the correct kind (Req 11.4)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...AMBIGUOUS_KEYS),
          fc.integer({ min: 0, max: 0xffffffff }),
          (key, seed) => {
            const target = AMBIGUOUS_MAP[key];
            const resolved = resolveTrapping(key, mulberry32(seed >>> 0));

            // Exactly one concrete item — AMBIGUOUS_MAP keys are 1→1 mappings and are
            // matched whole-string before any or/and split (so inner " or " in
            // "Melee Weapon (Basic or Cavalry)" never splits it).
            expect(resolved).toHaveLength(1);

            const only = resolved[0];
            // Routed to the correct kind and carrying the mapped target's name.
            expect(only.kind).toBe(expectedKind(target));
            expect(resolvedName(only)).toBe(target);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('an "A or B" entry resolves to exactly one item, the resolution of one option (Req 11.3)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...OR_ENTRIES),
          fc.integer({ min: 0, max: 0xffffffff }),
          (entry, seed) => {
            const options = entry.split(' or ').map((o) => o.trim());

            // The acceptable names are exactly the single resolution of each option
            // (every option here resolves to one item).
            const acceptableNames = options.map((opt) => {
              const optResolved = resolveTrapping(opt, mulberry32(seed >>> 0));
              expect(optResolved).toHaveLength(1);
              return resolvedName(optResolved[0]);
            });

            const resolved = resolveTrapping(entry, mulberry32(seed >>> 0));

            // Exactly ONE item regardless of seed (the RNG picks a single option).
            expect(resolved).toHaveLength(1);
            // And that item is the resolution of one of the two options.
            expect(acceptableNames).toContain(resolvedName(resolved[0]));
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
