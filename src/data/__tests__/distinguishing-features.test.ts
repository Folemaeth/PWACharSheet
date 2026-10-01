import { describe, it, expect } from 'vitest';
import type { SpeciesGroup } from '../personal-details';
import {
  FEATURE_POOLS,
  FALLBACK_FEATURE_POOL,
  resolveFeaturePool,
} from '../distinguishing-features';

/** Non-Dwarf species groups, each of which must have a dedicated non-empty pool (Req 16.6). */
const NON_DWARF_GROUPS: SpeciesGroup[] = ['Human', 'Halfling', 'High_Elf', 'Wood_Elf', 'Ogre'];

/** Asserts a pool is a non-empty array whose every element is a non-empty string. */
function expectNonEmptyStringPool(pool: string[]): void {
  expect(Array.isArray(pool)).toBe(true);
  expect(pool.length).toBeGreaterThan(0);
  for (const feature of pool) {
    expect(typeof feature).toBe('string');
    expect(feature.trim().length).toBeGreaterThan(0);
  }
}

describe('distinguishing feature pools', () => {
  describe('coverage: every non-Dwarf SpeciesGroup resolves to a non-empty pool (Req 16.6)', () => {
    it.each(NON_DWARF_GROUPS)('%s resolves to a non-empty pool of non-empty strings', (group) => {
      const pool = resolveFeaturePool(group);
      expectNonEmptyStringPool(pool);
      // The dedicated pool is returned verbatim, not the fallback.
      expect(pool).toBe(FEATURE_POOLS[group]);
    });
  });

  describe('fallback behaviour (Req 16.6)', () => {
    it('FALLBACK_FEATURE_POOL is non-empty with non-empty strings', () => {
      expectNonEmptyStringPool(FALLBACK_FEATURE_POOL);
    });

    it('an unrecognised group falls back to FALLBACK_FEATURE_POOL', () => {
      expect(resolveFeaturePool('Skaven')).toBe(FALLBACK_FEATURE_POOL);
    });

    it('an empty group string falls back to FALLBACK_FEATURE_POOL', () => {
      expect(resolveFeaturePool('')).toBe(FALLBACK_FEATURE_POOL);
    });

    it("the 'Dwarf' group has no dedicated pool and falls back (Dwarf features are rulebook-sourced)", () => {
      expect(FEATURE_POOLS['Dwarf']).toBeUndefined();
      expect(resolveFeaturePool('Dwarf')).toBe(FALLBACK_FEATURE_POOL);
    });
  });
});
