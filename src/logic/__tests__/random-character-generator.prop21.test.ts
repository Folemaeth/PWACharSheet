import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { calculateTotalWounds } from '../calculators';
import { backfillCharacter } from '../../hooks/useCharacter';

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

/** The Hardy talent level on a character (0 if absent) — mirrors backfillCharacter. */
function hardyLevelOf(talents: { n: string; lvl: number }[]): number {
  const hardy = talents.find((t) => t.n === 'Hardy');
  return hardy ? hardy.lvl : 0;
}

// Feature: random-character-generator, Property 21 — Wounds are left for backfill
// and compute to a correct maximum.

describe('Feature: random-character-generator', () => {
  describe('Property 21 — Wounds are left for backfill and compute to a correct maximum', () => {
    /**
     * **Validates: Requirements 12.1, 12.2**
     *
     * The generator deliberately does NOT set current wounds (`wCur` left 0) so the
     * existing downstream wound backfill can initialise it to the wound maximum
     * (Req 12.1). It DOES populate the species-derived wound inputs — `woundsUseSB`
     * plus the characteristics that feed the wound maximum (S, T, WP) — so the
     * existing wound-max calculation yields a correct, well-formed maximum (Req 12.2).
     *
     * Core p.33 (Attributes Table): Wounds max = SB + (2 × TB) + WPB, where a bonus is
     * floor(characteristic / 10). Halflings have the Small Talent and exclude SB
     * (woundsUseSB = false) → (2 × TB) + WPB (Core p.33–34).
     *
     * Rather than re-derive the formula, this property drives the app's REAL wound
     * functions on the generated character so the test tracks the live logic:
     *   - `calculateTotalWounds` (the single source of truth in logic/calculators),
     *   - `backfillCharacter` (the existing load/creation backfill in hooks/useCharacter).
     *
     * For every generated character, regardless of seed:
     *   - `wCur === 0` — left for backfill (Req 12.1).
     *   - the app's `calculateTotalWounds` on the character's own chars + woundsUseSB
     *     returns a positive integer — a correct, well-formed maximum (Req 12.2).
     *   - running the real `backfillCharacter` sets `wCur` to exactly that maximum,
     *     confirming the generator's left-for-backfill inputs are consumed correctly
     *     (Req 12.1, 12.2).
     */
    it('leaves wCur = 0 and yields a positive wound maximum that backfill applies', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // Req 12.1: the generator never sets current wounds — left for backfill.
          expect(char.wCur).toBe(0);

          // Req 12.2: the app's own wound-max calculation on the generated character's
          // inputs (chars + woundsUseSB) yields a correct, well-formed maximum.
          // Core p.33: Wounds max = SB + 2×TB + WPB (Halflings exclude SB). Hardy level
          // is read exactly as the app reads it (0 for freshly generated characters).
          const hardyLevel = hardyLevelOf(char.talents);
          const woundMax = calculateTotalWounds(char.chars, char.woundsUseSB, hardyLevel);
          expect(Number.isInteger(woundMax)).toBe(true);
          expect(woundMax).toBeGreaterThan(0);

          // Req 12.1 + 12.2: running the REAL backfill (which auto-initialises wCur to
          // the wound maximum when wCur === 0) sets current wounds to that maximum,
          // proving the left-for-backfill inputs are consumed correctly downstream.
          const backfilled = backfillCharacter(structuredClone(char));
          expect(backfilled.wCur).toBe(woundMax);
        }),
        { numRuns: 100 },
      );
    });
  });
});
