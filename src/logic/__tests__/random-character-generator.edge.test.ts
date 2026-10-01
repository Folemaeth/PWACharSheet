import { describe, it, expect } from 'vitest';
import {
  rollSpecies,
  pickEligibleCareer,
  rollStartingWealth,
  generateRandomCharacter,
} from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { SPECIES_DATA } from '../../data/species';
import { CAREER_SCHEMES } from '../../data/careers';
import { getEligibleCareers } from '../career-eligibility';
import { resolveNamePool } from '../../data/character-names';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
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
 * RNG that returns a fixed d100-equivalent so `rollD100` lands exactly on a given
 * roll `r` (1..100). `rollD100` computes `floor(x * 100) + 1`, so x = (r - 1) / 100
 * yields exactly `r`. Repeats that value forever.
 */
function fixedD100Rng(r: number): RNG {
  return () => (r - 1) / 100;
}

describe('rollSpecies — Random Species Table band edges (Core p.24)', () => {
  // Table: 01–90 Human, 91–94 Halfling, 95–98 Dwarf, 99 High Elf, 00(=100) Wood Elf.
  const cases: Array<[number, string]> = [
    [90, 'Human / Reiklander'],
    [91, 'Halfling'],
    [94, 'Halfling'],
    [95, 'Dwarf'],
    [98, 'Dwarf'],
    [99, 'High Elf'],
    [100, 'Wood Elf'],
  ];

  it.each(cases)('roll %i maps to %s', (roll, expected) => {
    expect(rollSpecies(fixedD100Rng(roll))).toBe(expected);
  });

  it('every band-edge species maps to a defined SPECIES_DATA key', () => {
    for (const [roll] of cases) {
      const species = rollSpecies(fixedD100Rng(roll));
      expect(SPECIES_DATA[species]).toBeDefined();
    }
  });
});

describe('name pool fallback — species key with no dedicated pool (Req 2.3)', () => {
  it('a Dwarf stronghold variant key normalises to a non-empty pool', () => {
    // "Dwarfs (Karaz-a-Karak)" has no dedicated NAME_POOLS entry; it normalises to
    // the base "Dwarf" pool. Confirms the documented key-normalisation fallback.
    const pool = resolveNamePool('Dwarfs (Karaz-a-Karak)');
    expect(pool.length).toBeGreaterThan(0);
  });

  it('an entirely unknown species key falls back to a non-empty pool', () => {
    const pool = resolveNamePool('Totally Unknown Species');
    expect(pool.length).toBeGreaterThan(0);
  });

  it('a generated character for a variant species key gets a non-empty name', () => {
    // Drive the generator with many seeds; every character must have a non-empty name
    // regardless of which species (incl. fallback-reliant keys) is rolled.
    for (let seed = 0; seed < 50; seed++) {
      const char = generateRandomCharacter(mulberry32(seed));
      expect(char.name.length).toBeGreaterThan(0);
      // The chosen name must belong to the resolved pool for that species.
      expect(resolveNamePool(char.species)).toContain(char.name);
    }
  });
});

describe('rollStartingWealth — unparseable status → zero wealth, no throw (Req 11.8)', () => {
  const rng = mulberry32(1);

  it('returns zero wealth for an empty status without throwing', () => {
    expect(() => rollStartingWealth(rng, '')).not.toThrow();
    expect(rollStartingWealth(rng, '')).toEqual({ wD: 0, wSS: 0, wGC: 0 });
  });

  it('returns zero wealth for a status missing a standing', () => {
    expect(rollStartingWealth(rng, 'Silver')).toEqual({ wD: 0, wSS: 0, wGC: 0 });
  });

  it('returns zero wealth for an unknown tier', () => {
    expect(rollStartingWealth(rng, 'Platinum 3')).toEqual({ wD: 0, wSS: 0, wGC: 0 });
  });

  it('returns zero wealth for a non-numeric standing', () => {
    expect(rollStartingWealth(rng, 'Gold NaN')).toEqual({ wD: 0, wSS: 0, wGC: 0 });
  });

  it('still rolls real wealth for a well-formed Gold status (sanity)', () => {
    // Gold → 1 GC per Standing (Core p.37), deterministic (no d10).
    expect(rollStartingWealth(rng, 'Gold 2')).toEqual({ wD: 0, wSS: 0, wGC: 2 });
  });
});

describe('career eligibility — High-Elf elite careers excluded (Req 4.2)', () => {
  // These High Elf elite careers start at level 2 (no level1) per the High Elf guide.
  const ELITE_NO_LEVEL1 = ['Smith-Priest of Vaul', 'Storm Weaver', 'Loremaster of Hoeth'];

  it('elite level-2-only careers are excluded from a High Elf eligible set', () => {
    const startable = getEligibleCareers('High Elf').filter((c) => CAREER_SCHEMES[c]?.level1);
    for (const elite of ELITE_NO_LEVEL1) {
      expect(startable).not.toContain(elite);
    }
  });

  it('pickEligibleCareer never returns an elite level-2-only career for High Elves', () => {
    for (let seed = 0; seed < 100; seed++) {
      const career = pickEligibleCareer(mulberry32(seed), 'High Elf');
      expect(ELITE_NO_LEVEL1).not.toContain(career);
      expect(CAREER_SCHEMES[career].level1).toBeDefined();
    }
  });
});
