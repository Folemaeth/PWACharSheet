import { describe, it, expect } from 'vitest';
import { resolveTrapping, AMBIGUOUS_MAP, type ResolvedTrapping } from '../trapping-resolver';
import type { RNG } from '../random-character-generator';
import { WEAPONS } from '../../data/weapons';
import { ARMOURS } from '../../data/armour';

/**
 * Trapping-resolver unit tests (Req 11.3–11.7).
 *
 * Covers weapon routing, armour routing, named-trapping routing, " or " single-pick
 * and " and " multi-resolve splitting, each AMBIGUOUS_MAP ⚠ entry resolving to its
 * documented concrete item, and the unknown-name fallback (named trapping, qty ≥ 1).
 */

/** RNG that replays a fixed sequence of values, repeating the last once exhausted. */
function sequenceRng(values: number[]): RNG {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

/** A deterministic RNG used where the choice does not matter for the assertion. */
const anyRng: RNG = () => 0;

describe('resolveTrapping — weapon routing (Req 11.5)', () => {
  it('resolves an exact WEAPONS name to a weapon with the full stat block', () => {
    const [resolved] = resolveTrapping('Hand Weapon', anyRng);
    expect(resolved.kind).toBe('weapon');
    const source = WEAPONS.find((w) => w.name === 'Hand Weapon')!;
    if (resolved.kind !== 'weapon') throw new Error('expected weapon');
    expect(resolved.item).toEqual(source);
    // Full stat block carried: group, enc, damage, qualities all present.
    expect(resolved.item.group).toBe(source.group);
    expect(resolved.item.enc).toBe(source.enc);
    expect(resolved.item.damage).toBe(source.damage);
    expect(resolved.item.qualities).toBe(source.qualities);
  });
});

describe('resolveTrapping — armour routing (Req 11.6)', () => {
  it('resolves an exact ARMOURS name to armour with the full stat block', () => {
    const [resolved] = resolveTrapping('Leather Jack', anyRng);
    expect(resolved.kind).toBe('armour');
    const source = ARMOURS.find((a) => a.name === 'Leather Jack')!;
    if (resolved.kind !== 'armour') throw new Error('expected armour');
    expect(resolved.item).toEqual(source);
    expect(resolved.item.locations).toBe(source.locations);
    expect(resolved.item.ap).toBe(source.ap);
    expect(resolved.item.armourType).toBe(source.armourType);
  });
});

describe('resolveTrapping — named-trapping routing & fallback (Req 11.7)', () => {
  it('stores an unknown name as a named trapping with quantity 1', () => {
    const result = resolveTrapping('Pouch', anyRng);
    expect(result).toEqual<ResolvedTrapping[]>([
      { kind: 'trapping', item: { name: 'Pouch', enc: '0', quantity: 1 } },
    ]);
  });

  it('parses a leading quantity phrase into a sensible quantity (≥ 1)', () => {
    const [resolved] = resolveTrapping('2 Candles', anyRng);
    expect(resolved.kind).toBe('trapping');
    if (resolved.kind !== 'trapping') throw new Error('expected trapping');
    expect(resolved.item.name).toBe('Candles');
    expect(resolved.item.quantity).toBe(2);
    expect(resolved.item.quantity).toBeGreaterThanOrEqual(1);
  });

  it('resolves "Trade Tools" (and its variant) to a named trapping, quantity ≥ 1', () => {
    for (const entry of ['Trade Tools', 'Trade Tools (as Trade)']) {
      const [resolved] = resolveTrapping(entry, anyRng);
      expect(resolved.kind).toBe('trapping');
      if (resolved.kind !== 'trapping') throw new Error('expected trapping');
      expect(resolved.item.name).toBe('Trade Tools');
      expect(resolved.item.quantity).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('resolveTrapping — " or " single-pick splitting (Req 11.3)', () => {
  it('picks exactly one option and resolves only that one', () => {
    // Two options; sequenceRng([0]) → pick the first ("Dagger").
    const first = resolveTrapping('Dagger or Hand Weapon', sequenceRng([0]));
    expect(first).toHaveLength(1);
    expect(first[0].kind).toBe('weapon');
    if (first[0].kind !== 'weapon') throw new Error('expected weapon');
    expect(first[0].item.name).toBe('Dagger');

    // Near-1 → pick the last option ("Hand Weapon").
    const last = resolveTrapping('Dagger or Hand Weapon', sequenceRng([0.9999999999]));
    expect(last).toHaveLength(1);
    if (last[0].kind !== 'weapon') throw new Error('expected weapon');
    expect(last[0].item.name).toBe('Hand Weapon');
  });
});

describe('resolveTrapping — " and " multi-resolve splitting (Req 11.3)', () => {
  it('resolves every part and returns all of them', () => {
    const result = resolveTrapping('Hand Weapon and Leather Jack', anyRng);
    expect(result).toHaveLength(2);
    const kinds = result.map((r) => r.kind);
    expect(kinds).toContain('weapon');
    expect(kinds).toContain('armour');
    const weapon = result.find((r) => r.kind === 'weapon');
    const armour = result.find((r) => r.kind === 'armour');
    expect(weapon && weapon.kind === 'weapon' && weapon.item.name).toBe('Hand Weapon');
    expect(armour && armour.kind === 'armour' && armour.item.name).toBe('Leather Jack');
  });
});

describe('resolveTrapping — AMBIGUOUS_MAP ⚠ judgment-call entries (Req 11.4, 13.3)', () => {
  it('"Melee Weapon (Basic or Cavalry)" resolves to the documented Hand Weapon', () => {
    const [resolved] = resolveTrapping('Melee Weapon (Basic or Cavalry)', anyRng);
    expect(resolved.kind).toBe('weapon');
    if (resolved.kind !== 'weapon') throw new Error('expected weapon');
    expect(resolved.item.name).toBe('Hand Weapon');
    expect(AMBIGUOUS_MAP['Melee Weapon (Basic or Cavalry)']).toBe('Hand Weapon');
  });

  it('"Boiled Leather Breastplate" resolves to the documented Leather Jerkin', () => {
    const [resolved] = resolveTrapping('Boiled Leather Breastplate', anyRng);
    expect(resolved.kind).toBe('armour');
    if (resolved.kind !== 'armour') throw new Error('expected armour');
    expect(resolved.item.name).toBe('Leather Jerkin');
    expect(resolved.item.armourType).toBe('BoiledLeather');
    expect(AMBIGUOUS_MAP['Boiled Leather Breastplate']).toBe('Leather Jerkin');
  });

  it('"Longbow and 10 arrows" resolves to Bow (weapon) + 10 Arrows (trapping)', () => {
    const result = resolveTrapping('Longbow and 10 arrows', anyRng);
    expect(result).toHaveLength(2);
    const weapon = result.find((r) => r.kind === 'weapon');
    const trapping = result.find((r) => r.kind === 'trapping');
    expect(weapon && weapon.kind === 'weapon' && weapon.item.name).toBe('Bow');
    if (!weapon || weapon.kind !== 'weapon') throw new Error('expected weapon');
    // Full stat block carried from WEAPONS.
    expect(weapon.item.group).toBe('Bow');
    if (!trapping || trapping.kind !== 'trapping') throw new Error('expected trapping');
    expect(trapping.item.quantity).toBe(10);
    expect(trapping.item.quantity).toBeGreaterThanOrEqual(1);
  });

  it('"Sling with 10 stones" resolves to Sling (weapon) + 10 stones (trapping)', () => {
    const result = resolveTrapping('Sling with 10 stones', anyRng);
    expect(result).toHaveLength(2);
    const weapon = result.find((r) => r.kind === 'weapon');
    const trapping = result.find((r) => r.kind === 'trapping');
    expect(weapon && weapon.kind === 'weapon' && weapon.item.name).toBe('Sling');
    if (!trapping || trapping.kind !== 'trapping') throw new Error('expected trapping');
    expect(trapping.item.quantity).toBe(10);
    expect(trapping.item.quantity).toBeGreaterThanOrEqual(1);
  });
});

describe('resolveTrapping — result isolation', () => {
  it('returns fresh objects so mutating one result does not affect another call', () => {
    const a = resolveTrapping('Longbow and 10 arrows', anyRng);
    const b = resolveTrapping('Longbow and 10 arrows', anyRng);
    const aw = a.find((r) => r.kind === 'weapon');
    if (aw && aw.kind === 'weapon') aw.item.name = 'MUTATED';
    const bw = b.find((r) => r.kind === 'weapon');
    expect(bw && bw.kind === 'weapon' && bw.item.name).toBe('Bow');
  });
});
