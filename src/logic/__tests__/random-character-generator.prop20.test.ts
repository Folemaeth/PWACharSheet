import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolveNamePool } from '../../data/character-names';
import { SPECIES_OPTIONS } from '../../data/species';

/**
 * Feature: random-character-generator, Property 20 — Every species has a resolvable,
 * non-empty name pool
 *
 * **Validates: Requirements 2.2**
 *
 * Design text ("Data Models → Name_Pool", Req 2.2): for every SPECIES_OPTIONS key,
 * `resolveNamePool` returns a non-empty pool of non-empty name strings. The resolver
 * guarantees this via its priority order (dedicated → normalised base-species →
 * FALLBACK_NAME_POOL), so no species key can ever yield an empty or whitespace-only
 * name pool.
 *
 * SOURCE NOTE (Req 2.4, 13.2): the name pools are curated FLAVOUR with no mechanical
 * effect and are NOT a rulebook table — this property only asserts their structural
 * coverage, not any WFRP4e game mechanic.
 *
 * SPECIES_OPTIONS is a finite set, so this file proves the property two ways:
 *   1. A single fast-check Property 20 (≥100 iterations) drawing a species key via
 *      `fc.constantFrom(...SPECIES_OPTIONS)` — exercises the randomized draw path.
 *   2. A deterministic exhaustive loop over EVERY SPECIES_OPTIONS key — guarantees
 *      total coverage of the finite key space.
 */

/** Asserts a resolved pool is a non-empty array of non-empty, trimmed name strings. */
function assertNonEmptyNamePool(speciesKey: string): void {
  const pool = resolveNamePool(speciesKey);
  // Must be a non-empty array.
  expect(Array.isArray(pool)).toBe(true);
  expect(pool.length).toBeGreaterThan(0);
  // Every entry must be a non-empty, trimmed string.
  for (const name of pool) {
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
    expect(name.trim()).toBe(name);
    expect(name.trim().length).toBeGreaterThan(0);
  }
}

describe('Feature: random-character-generator', () => {
  describe('Property 20 — every species has a resolvable, non-empty name pool', () => {
    it('for any SPECIES_OPTIONS key, resolveNamePool returns a non-empty pool of non-empty names', () => {
      fc.assert(
        fc.property(fc.constantFrom(...SPECIES_OPTIONS), (speciesKey) => {
          assertNonEmptyNamePool(speciesKey);
        }),
        { numRuns: 100 },
      );
    });

    // Exhaustive deterministic coverage of the finite SPECIES_OPTIONS key space (Req 2.2).
    it('every SPECIES_OPTIONS key (exhaustive) resolves to a non-empty pool of non-empty names', () => {
      expect(SPECIES_OPTIONS.length).toBeGreaterThan(0);
      for (const speciesKey of SPECIES_OPTIONS) {
        assertNonEmptyNamePool(speciesKey);
      }
    });
  });
});
