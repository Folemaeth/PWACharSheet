import { describe, it, expect } from 'vitest';
import { SPECIES_OPTIONS } from '../species';
import {
  NAME_POOLS,
  FALLBACK_NAME_POOL,
  normaliseSpeciesKey,
  resolveNamePool,
} from '../character-names';

describe('character name pools', () => {
  describe('coverage: every SPECIES_OPTIONS key resolves to a non-empty pool', () => {
    it.each(SPECIES_OPTIONS)('%s resolves to a non-empty name pool', (speciesKey) => {
      const pool = resolveNamePool(speciesKey);
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      // Every name is a non-empty string (never produces an empty name — Req 2.3).
      for (const name of pool) {
        expect(typeof name).toBe('string');
        expect(name.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('base-species dedicated pools', () => {
    const baseKeys = ['Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf', 'Ogre'];

    it.each(baseKeys)('%s has a dedicated non-empty NAME_POOLS entry', (key) => {
      expect(NAME_POOLS[key]).toBeDefined();
      expect(NAME_POOLS[key].length).toBeGreaterThan(0);
    });

    it('dedicated pools are returned verbatim by resolveNamePool', () => {
      expect(resolveNamePool('Dwarf')).toBe(NAME_POOLS['Dwarf']);
      expect(resolveNamePool('Human / Reiklander')).toBe(NAME_POOLS['Human / Reiklander']);
    });
  });

  describe('variant keys normalise to their documented base-species pool', () => {
    it('Dwarf stronghold/variant keys normalise to Dwarf', () => {
      const dwarfVariants = SPECIES_OPTIONS.filter(
        (k) => k === 'Dwarf' || k.startsWith('Dwarfs'),
      );
      // Sanity: the data really does contain Dwarf variant keys.
      expect(dwarfVariants.length).toBeGreaterThan(1);
      for (const key of dwarfVariants) {
        expect(normaliseSpeciesKey(key)).toBe('Dwarf');
        expect(resolveNamePool(key)).toBe(NAME_POOLS['Dwarf']);
      }
    });

    it('High Elf realm/variant keys normalise to High Elf', () => {
      const heVariants = SPECIES_OPTIONS.filter(
        (k) => k === 'High Elf' || k.startsWith('High Elves'),
      );
      expect(heVariants.length).toBeGreaterThan(1);
      for (const key of heVariants) {
        expect(normaliseSpeciesKey(key)).toBe('High Elf');
        expect(resolveNamePool(key)).toBe(NAME_POOLS['High Elf']);
      }
    });

    it('normalises the exact documented mappings', () => {
      expect(normaliseSpeciesKey('Human / Reiklander')).toBe('Human');
      expect(normaliseSpeciesKey('Halfling')).toBe('Halfling');
      expect(normaliseSpeciesKey('Wood Elf')).toBe('Wood Elf');
      expect(normaliseSpeciesKey('Ogre')).toBe('Ogre');
    });

    it('Wood Elf is not shadowed by the High Elf prefix check', () => {
      expect(normaliseSpeciesKey('Wood Elf')).toBe('Wood Elf');
      expect(resolveNamePool('Wood Elf')).toBe(NAME_POOLS['Wood Elf']);
    });
  });

  describe('fallback behaviour (Req 2.3)', () => {
    it('FALLBACK_NAME_POOL is non-empty', () => {
      expect(FALLBACK_NAME_POOL.length).toBeGreaterThan(0);
    });

    it('an unmatched species key falls back to FALLBACK_NAME_POOL', () => {
      expect(normaliseSpeciesKey('Skaven')).toBeUndefined();
      expect(resolveNamePool('Skaven')).toBe(FALLBACK_NAME_POOL);
    });

    it('an empty key falls back to FALLBACK_NAME_POOL', () => {
      expect(resolveNamePool('')).toBe(FALLBACK_NAME_POOL);
    });
  });
});
