import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateRandomCharacter, rollStartingWealth } from '../random-character-generator';
import type { RNG } from '../random-character-generator';

/**
 * Feature: random-character-generator, Property 18 — Starting wealth matches Status
 * Tier and Standing
 *
 * **Validates: Requirements 11.8**
 *
 * Design text / Core p.37 ("Status Tier Starting Wealth"): wealth is granted PER
 * STATUS LEVEL (Standing):
 *   - Brass  → 2d10 brass pennies per Standing   → sum of (2 × standing) d10 into wD
 *   - Silver → 1d10 silver shillings per Standing → sum of (standing) d10 into wSS
 *   - Gold   → 1 Gold crown per Standing          → wGC = standing (no dice)
 * Worked example (Core p.37): Brass 3 → 6d10 d; Silver 3 → 3d10 ss; Gold 3 → 3 GC.
 *
 * An unparseable status (empty, missing standing, unknown tier, non-numeric standing)
 * yields zero wealth and must not throw (Design "rollStartingWealth"; Req 13.3).
 *
 * Each d10 is an integer in [1, 10], so the summed total is bounded:
 *   Brass wD  ∈ [2·standing·1, 2·standing·10]
 *   Silver wSS ∈ [standing·1, standing·10]
 * We assert the result falls inside those bounds and is an integer, and that the two
 * non-active currencies are exactly 0 for each tier.
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

type Tier = 'Brass' | 'Silver' | 'Gold';

/** Assert a wealth result respects the Core p.37 bounds for a given tier/standing. */
function expectWealthInRange(
  result: { wD: number; wSS: number; wGC: number },
  tier: Tier,
  standing: number,
): void {
  if (tier === 'Brass') {
    // 2d10 per Standing: sum of (2·standing) d10, each in [1, 10].
    const dice = 2 * standing;
    expect(result.wSS).toBe(0);
    expect(result.wGC).toBe(0);
    expect(Number.isInteger(result.wD)).toBe(true);
    expect(result.wD).toBeGreaterThanOrEqual(dice * 1);
    expect(result.wD).toBeLessThanOrEqual(dice * 10);
  } else if (tier === 'Silver') {
    // 1d10 per Standing: sum of (standing) d10, each in [1, 10].
    expect(result.wD).toBe(0);
    expect(result.wGC).toBe(0);
    expect(Number.isInteger(result.wSS)).toBe(true);
    expect(result.wSS).toBeGreaterThanOrEqual(standing * 1);
    expect(result.wSS).toBeLessThanOrEqual(standing * 10);
  } else {
    // Gold: exactly `standing` gold crowns, no dice.
    expect(result.wD).toBe(0);
    expect(result.wSS).toBe(0);
    expect(result.wGC).toBe(standing);
  }
}

describe('Feature: random-character-generator', () => {
  describe('Property 18 — Starting wealth matches Status Tier and Standing', () => {
    it('for any tier/standing/seed, rollStartingWealth stays within the Core p.37 bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xffffffff }),
          fc.constantFrom<Tier>('Brass', 'Silver', 'Gold'),
          fc.integer({ min: 1, max: 7 }),
          (seed, tier, standing) => {
            const status = `${tier} ${standing}`;
            const result = rollStartingWealth(mulberry32(seed >>> 0), status);
            expectWealthInRange(result, tier, standing);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('unparseable statuses yield zero wealth and never throw', () => {
      const unparseable = [
        '', // empty
        '   ', // whitespace only
        'Silver', // missing standing
        'Gold', // missing standing
        'Copper 2', // unknown tier
        'Platinum 3', // unknown tier
        'Silver x', // non-numeric standing
        'Brass abc', // non-numeric standing
        'Gold 0', // zero standing (<= 0 → unparseable)
        'Silver -2', // negative standing
      ];
      for (const status of unparseable) {
        let result: { wD: number; wSS: number; wGC: number } | undefined;
        expect(() => {
          result = rollStartingWealth(mulberry32(1), status);
        }).not.toThrow();
        expect(result).toEqual({ wD: 0, wSS: 0, wGC: 0 });
      }
    });

    it('a generated character wealth is consistent with its own status string', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 0xffffffff }), (seed) => {
          const char = generateRandomCharacter(mulberry32(seed >>> 0));

          // Parse the character's own status (e.g. "Silver 2") the same way the
          // generator does, then assert the stored wealth matches the tier/standing
          // bounds from Core p.37.
          const parts = char.status.trim().split(/\s+/);
          const tier = parts[0] as Tier;
          const standing = parseInt(parts[1] ?? '', 10);
          const wealth = { wD: char.wD, wSS: char.wSS, wGC: char.wGC };

          const knownTier = tier === 'Brass' || tier === 'Silver' || tier === 'Gold';
          if (knownTier && Number.isFinite(standing) && standing > 0) {
            expectWealthInRange(wealth, tier, standing);
          } else {
            // Unparseable status on a generated character → zero wealth.
            expect(wealth).toEqual({ wD: 0, wSS: 0, wGC: 0 });
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
