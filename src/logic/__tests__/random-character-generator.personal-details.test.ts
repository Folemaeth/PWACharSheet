import { describe, it, expect } from 'vitest';
import { buildPersonalDetails, generateRandomCharacter, rollSex } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import {
  getSpeciesGroup,
  generateHeight,
  formatVariegatedEyes,
  lookupEyeColour,
  lookupDwarfAlternateTable,
} from '../personal-details';
import {
  resolveFeaturePool,
  FEATURE_POOLS,
  FALLBACK_FEATURE_POOL,
} from '../../data/distinguishing-features';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { AGE_FORMULAS, HEIGHT_FORMULAS } from '../../data/personal-details';
import { resolveGenderedNamePool, resolveNamePool } from '../../data/character-names';

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
 * Convert a target d10 value `v` (1..10) into the RNG float that produces it.
 * `rollD10` computes `floor(x * 10) + 1`, so x = (v - 1) / 10 yields exactly `v`.
 */
function d10Float(v: number): number {
  return (v - 1) / 10;
}

/**
 * Convert a target d100 value `r` (1..100) into the RNG float that produces it.
 * `rollD100` computes `floor(x * 100) + 1`, so x = (r - 1) / 100 yields exactly `r`.
 */
function d100Float(r: number): number {
  return (r - 1) / 100;
}

/**
 * A scripted RNG that returns a queue of fixed floats in order, then falls back to a
 * deterministic mulberry32 tail once the queue is exhausted. Lets a test force the
 * exact dice at the front of `buildPersonalDetails`' fixed consumption order and leave
 * later draws (e.g. the feature pick) deterministic-but-unconstrained.
 */
function scriptedRng(queue: number[], tailSeed = 1): RNG {
  const tail = mulberry32(tailSeed);
  let i = 0;
  return () => (i < queue.length ? queue[i++] : tail());
}

/** Build a fresh blank Character clone for an isolated personal-details run. */
function blankChar(): Character {
  return structuredClone(BLANK_CHARACTER);
}

// ─── Group-mapping sanity (uses real SPECIES_DATA keys) ──────────────────────

describe('getSpeciesGroup maps the real species keys used below', () => {
  it('maps each species key to its expected group', () => {
    expect(getSpeciesGroup('Human / Reiklander')).toBe('Human');
    expect(getSpeciesGroup('High Elf')).toBe('High_Elf');
    expect(getSpeciesGroup('Wood Elf')).toBe('Wood_Elf');
    expect(getSpeciesGroup('Dwarf')).toBe('Dwarf');
    expect(getSpeciesGroup('Halfling')).toBe('Halfling');
    expect(getSpeciesGroup('Nonexistent Species')).toBeUndefined();
  });
});

// ─── 1. Human bonus-die path (Req 16.1, 16.3) ────────────────────────────────

describe('buildPersonalDetails — Human bonus-die height path (Req 16.1, 16.3)', () => {
  it('applies the bonus die when a height d10 rolls a 10', () => {
    // Consumption order for the Human group:
    //   age     → AGE_FORMULAS.Human.diceCount (1) d10
    //   height  → HEIGHT_FORMULAS.Human.diceCount (2) d10, +1 bonus d10 iff either is 10
    //   hair    → 2 d10
    //   eyes    → 2 d10 (Human: no second roll)
    //   feature → 1 pick draw
    expect(AGE_FORMULAS.Human.diceCount).toBe(1);
    expect(HEIGHT_FORMULAS.Human.diceCount).toBe(2);

    const ageDie = 4;
    const heightDice: [number, number] = [10, 6]; // first die is 10 → triggers bonus
    const bonusDie = 7;

    const queue = [
      d10Float(ageDie),
      d10Float(heightDice[0]),
      d10Float(heightDice[1]),
      d10Float(bonusDie),
    ];
    const char = blankChar();

    expect(() =>
      buildPersonalDetails(scriptedRng(queue), char, 'Human / Reiklander')
    ).not.toThrow();

    // Height must reflect the bonus die exactly as generateHeight computes it.
    expect(char.height).toBe(generateHeight('Human', heightDice, bonusDie));

    // Age is a non-empty numeric string.
    expect(char.age).not.toBe('');
    expect(Number.isNaN(Number(char.age))).toBe(false);
  });

  it('does not consume a bonus die when neither height d10 is a 10', () => {
    const heightDice: [number, number] = [3, 6];
    const queue = [
      d10Float(5), // age d10
      d10Float(heightDice[0]),
      d10Float(heightDice[1]),
      // next draws (hair/eyes/feature) come from the deterministic tail
    ];
    const char = blankChar();

    buildPersonalDetails(scriptedRng(queue), char, 'Human / Reiklander');

    // No bonus die: height matches the plain (no-bonus) formula for those two dice.
    expect(char.height).toBe(generateHeight('Human', heightDice));
  });
});

// ─── 2. High-Elf / Wood-Elf two-roll variegated eyes (Req 16.4) ──────────────

describe('buildPersonalDetails — Elf two-roll variegated eyes (Req 16.4)', () => {
  // Builds the forced d10 queue up to and including the two eye-colour 2d10 rolls.
  // Elf (High/Wood) group consumption before eyes:
  //   age    → 10 d10 (AGE_FORMULAS diceCount 10)
  //   height → 1 d10  (HEIGHT_FORMULAS diceCount 1; not Human → no bonus)
  //   hair   → 2 d10
  //   eyes1  → 2 d10
  //   eyes2  → 2 d10
  function elfQueueWithEyes(
    group: 'High_Elf' | 'Wood_Elf',
    first2d10: [number, number],
    second2d10: [number, number]
  ): number[] {
    const ageCount = AGE_FORMULAS[group].diceCount;
    const heightCount = HEIGHT_FORMULAS[group].diceCount;
    const q: number[] = [];
    for (let i = 0; i < ageCount; i++) q.push(d10Float(5));
    for (let i = 0; i < heightCount; i++) q.push(d10Float(5));
    q.push(d10Float(5), d10Float(5)); // hair 2d10
    q.push(d10Float(first2d10[0]), d10Float(first2d10[1])); // eyes first 2d10
    q.push(d10Float(second2d10[0]), d10Float(second2d10[1])); // eyes second 2d10
    return q;
  }

  it.each(['High Elf', 'Wood Elf'] as const)(
    '%s combines two differing eye rolls into a flecked variegated colour',
    (speciesKey) => {
      const group = getSpeciesGroup(speciesKey) as 'High_Elf' | 'Wood_Elf';

      // Two differing 2d10 sums → two different table colours → variegated form.
      const firstDice: [number, number] = [1, 1]; // sum 2
      const secondDice: [number, number] = [9, 9]; // sum 18
      const firstColour = lookupEyeColour(group, firstDice[0] + firstDice[1]);
      const secondColour = lookupEyeColour(group, secondDice[0] + secondDice[1]);
      expect(firstColour).not.toBe(secondColour); // precondition for this case

      const char = blankChar();
      buildPersonalDetails(
        scriptedRng(elfQueueWithEyes(group, firstDice, secondDice)),
        char,
        speciesKey
      );

      expect(char.eyes).toBe(formatVariegatedEyes(firstColour, secondColour));
      expect(char.eyes).toContain(' flecked with ');
    }
  );

  it.each(['High Elf', 'Wood Elf'] as const)(
    '%s yields a plain colour when both eye rolls match',
    (speciesKey) => {
      const group = getSpeciesGroup(speciesKey) as 'High_Elf' | 'Wood_Elf';

      // Identical rolls → identical colours → plain (non-variegated) result.
      const sameDice: [number, number] = [3, 3]; // sum 6
      const colour = lookupEyeColour(group, sameDice[0] + sameDice[1]);

      const char = blankChar();
      buildPersonalDetails(
        scriptedRng(elfQueueWithEyes(group, sameDice, sameDice)),
        char,
        speciesKey
      );

      expect(char.eyes).toBe(formatVariegatedEyes(colour, colour));
      expect(char.eyes).toBe(colour);
      expect(char.eyes).not.toContain(' flecked with ');
    }
  );
});

// ─── 3. Dwarf feature from the official d100 table (Req 16.5) ─────────────────

describe('buildPersonalDetails — Dwarf feature from the d100 table (Req 16.5)', () => {
  // Dwarf group consumption before the feature's d100 roll:
  //   age    → 10 d10
  //   height → 1 d10
  //   hair   → 2 d10
  //   eyes   → 2 d10 (Dwarf: no second roll)
  //   feature → rollD100
  function dwarfQueueWithD100(roll: number): number[] {
    const ageCount = AGE_FORMULAS.Dwarf.diceCount;
    const heightCount = HEIGHT_FORMULAS.Dwarf.diceCount;
    const q: number[] = [];
    for (let i = 0; i < ageCount; i++) q.push(d10Float(5));
    for (let i = 0; i < heightCount; i++) q.push(d10Float(5));
    q.push(d10Float(5), d10Float(5)); // hair 2d10
    q.push(d10Float(5), d10Float(5)); // eyes 2d10
    q.push(d100Float(roll)); // feature d100
    return q;
  }

  it('draws the feature from lookupDwarfAlternateTable, not the curated pools', () => {
    const roll = 42; // 41–45 row → "Haughty Expression"
    const expected = lookupDwarfAlternateTable(roll, 'Dwarf').feature;

    const char = blankChar();
    buildPersonalDetails(scriptedRng(dwarfQueueWithD100(roll)), char, 'Dwarf');

    expect(char.distinguishingFeature).toBe(expected);

    // It must NOT be drawn from the curated flavour pools used for non-Dwarves.
    const curated = [
      ...Object.values(FEATURE_POOLS).flat(),
      ...FALLBACK_FEATURE_POOL,
    ];
    expect(curated).not.toContain(char.distinguishingFeature);
  });
});

// ─── 4. Non-Dwarf feature from the curated pool (Req 16.6) ────────────────────

describe('buildPersonalDetails — non-Dwarf feature from the pool (Req 16.6)', () => {
  it.each(['Human / Reiklander', 'High Elf', 'Wood Elf', 'Halfling'] as const)(
    '%s distinguishing feature is a member of its resolved pool',
    (speciesKey) => {
      const group = getSpeciesGroup(speciesKey)!;
      const char = blankChar();

      buildPersonalDetails(mulberry32(7), char, speciesKey);

      expect(char.distinguishingFeature).not.toBe('');
      expect(resolveFeaturePool(group)).toContain(char.distinguishingFeature);
    }
  );
});

// ─── 5. Undefined species group leaves fields blank, no throw (Req 16.2) ──────

describe('buildPersonalDetails — undefined species group (Req 16.2)', () => {
  it('leaves age/height/hair/eyes/feature blank and does not throw', () => {
    const char = blankChar();

    expect(() =>
      buildPersonalDetails(mulberry32(3), char, 'Nonexistent Species')
    ).not.toThrow();

    expect(char.age).toBe('');
    expect(char.height).toBe('');
    expect(char.hair).toBe('');
    expect(char.eyes).toBe('');
    expect(char.distinguishingFeature).toBe('');
    expect(char.sex).toBe('');
  });
});

// ─── 6. Sex is randomly rolled as Male or Female, and the name matches it ─────

describe('rollSex — flavour only, no mechanical effect', () => {
  it('rolls Male or Female (never Other, never blank) across many seeds', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 200; seed++) {
      const sex = rollSex(mulberry32(seed));
      expect(['Male', 'Female']).toContain(sex);
      seen.add(sex);
    }
    // Both outcomes must actually occur (sanity: not stuck on one value).
    expect(seen.has('Male')).toBe(true);
    expect(seen.has('Female')).toBe(true);
  });
});

describe('generated name matches the generated sex (Req 2.1)', () => {
  it('for many seeds, char.name is in the sex-matched sublist for its species', () => {
    for (let seed = 0; seed < 300; seed++) {
      const char = generateRandomCharacter(mulberry32(seed));
      expect(['Male', 'Female']).toContain(char.sex);

      // The name must belong to the sublist matching the rolled sex — never the
      // opposite sex (no males with female names or vice versa).
      const gendered = resolveGenderedNamePool(char.species);
      const matching = char.sex === 'Male' ? gendered.male : gendered.female;
      const opposite = char.sex === 'Male' ? gendered.female : gendered.male;
      expect(matching).toContain(char.name);
      // Guard against overlap producing a false pass: the name is not an
      // opposite-sex-ONLY name.
      if (!matching.includes(char.name)) {
        expect(opposite).not.toContain(char.name);
      }
      // And it is always a member of the combined pool (Req 2.3 membership).
      expect(resolveNamePool(char.species)).toContain(char.name);
    }
  });
});
