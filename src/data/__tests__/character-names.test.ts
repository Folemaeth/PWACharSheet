import { describe, it, expect } from 'vitest';
import { SPECIES_OPTIONS } from '../species';
import {
  NAME_POOLS,
  FALLBACK_NAME_POOL,
  normaliseSpeciesKey,
  resolveNamePool,
  resolveGenderedNamePool,
} from '../character-names';

describe('character name pools', () => {
  describe('coverage: every SPECIES_OPTIONS key resolves to non-empty pools', () => {
    it.each(SPECIES_OPTIONS)('%s resolves to a non-empty combined name pool', (speciesKey) => {
      const pool = resolveNamePool(speciesKey);
      expect(Array.isArray(pool)).toBe(true);
      expect(pool.length).toBeGreaterThan(0);
      // Every name is a non-empty string (never produces an empty name — Req 2.3).
      for (const name of pool) {
        expect(typeof name).toBe('string');
        expect(name.trim().length).toBeGreaterThan(0);
      }
    });

    it.each(SPECIES_OPTIONS)('%s has non-empty male AND female sublists', (speciesKey) => {
      const pool = resolveGenderedNamePool(speciesKey);
      expect(pool.male.length).toBeGreaterThan(0);
      expect(pool.female.length).toBeGreaterThan(0);
    });
  });

  describe('sex filtering (names match the character sex)', () => {
    it.each(SPECIES_OPTIONS)('%s: Male/Female sublists are returned for the matching sex', (speciesKey) => {
      const gendered = resolveGenderedNamePool(speciesKey);
      expect(resolveNamePool(speciesKey, 'Male')).toBe(gendered.male);
      expect(resolveNamePool(speciesKey, 'Female')).toBe(gendered.female);
    });

    it("sex 'Other', '' and undefined all return the combined male+female list", () => {
      const gendered = resolveGenderedNamePool('Human / Reiklander');
      const combined = [...gendered.male, ...gendered.female];
      expect(resolveNamePool('Human / Reiklander', 'Other')).toEqual(combined);
      expect(resolveNamePool('Human / Reiklander', '')).toEqual(combined);
      expect(resolveNamePool('Human / Reiklander')).toEqual(combined);
    });

    it('male and female sublists are disjoint per species (no shared names)', () => {
      for (const speciesKey of SPECIES_OPTIONS) {
        const { male, female } = resolveGenderedNamePool(speciesKey);
        const femaleSet = new Set(female);
        for (const name of male) {
          expect(femaleSet.has(name)).toBe(false);
        }
      }
    });

    it('each sublist has no duplicate names', () => {
      for (const speciesKey of SPECIES_OPTIONS) {
        const { male, female } = resolveGenderedNamePool(speciesKey);
        expect(new Set(male).size).toBe(male.length);
        expect(new Set(female).size).toBe(female.length);
      }
    });
  });

  describe('base-species dedicated pools', () => {
    const baseKeys = ['Human / Reiklander', 'Dwarf', 'Halfling', 'High Elf', 'Wood Elf', 'Ogre'];

    it.each(baseKeys)('%s has a dedicated pool with non-empty male/female lists', (key) => {
      expect(NAME_POOLS[key]).toBeDefined();
      expect(NAME_POOLS[key].male.length).toBeGreaterThan(0);
      expect(NAME_POOLS[key].female.length).toBeGreaterThan(0);
    });

    it('dedicated gendered pools are returned verbatim by resolveGenderedNamePool', () => {
      expect(resolveGenderedNamePool('Dwarf')).toBe(NAME_POOLS['Dwarf']);
      expect(resolveGenderedNamePool('Human / Reiklander')).toBe(NAME_POOLS['Human / Reiklander']);
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
        expect(resolveGenderedNamePool(key)).toBe(NAME_POOLS['Dwarf']);
      }
    });

    it('High Elf realm/variant keys normalise to High Elf', () => {
      const heVariants = SPECIES_OPTIONS.filter(
        (k) => k === 'High Elf' || k.startsWith('High Elves'),
      );
      expect(heVariants.length).toBeGreaterThan(1);
      for (const key of heVariants) {
        expect(normaliseSpeciesKey(key)).toBe('High Elf');
        expect(resolveGenderedNamePool(key)).toBe(NAME_POOLS['High Elf']);
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
      expect(resolveGenderedNamePool('Wood Elf')).toBe(NAME_POOLS['Wood Elf']);
    });
  });

  describe('fallback behaviour (Req 2.3)', () => {
    it('FALLBACK_NAME_POOL has non-empty male and female lists', () => {
      expect(FALLBACK_NAME_POOL.male.length).toBeGreaterThan(0);
      expect(FALLBACK_NAME_POOL.female.length).toBeGreaterThan(0);
    });

    it('an unmatched species key falls back to FALLBACK_NAME_POOL', () => {
      expect(normaliseSpeciesKey('Skaven')).toBeUndefined();
      expect(resolveGenderedNamePool('Skaven')).toBe(FALLBACK_NAME_POOL);
    });

    it('an empty key falls back to FALLBACK_NAME_POOL', () => {
      expect(resolveGenderedNamePool('')).toBe(FALLBACK_NAME_POOL);
    });
  });
});