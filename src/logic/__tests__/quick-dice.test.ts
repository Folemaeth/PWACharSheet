import { describe, it, expect } from 'vitest';
import {
  MAX_D10_COUNT,
  clampD10Count,
  describeQuickRoll,
  rollDie,
  rollQuickDice,
} from '../quick-dice';

/** RNG that returns the given values in order, then repeats the last one. */
function sequence(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('rollDie', () => {
  it('maps the RNG range onto 1..sides', () => {
    expect(rollDie(10, () => 0)).toBe(1);
    expect(rollDie(10, () => 0.999999)).toBe(10);
    expect(rollDie(100, () => 0)).toBe(1);
    expect(rollDie(100, () => 0.999999)).toBe(100);
  });
});

describe('clampD10Count', () => {
  it('keeps the pool between 1 and the maximum', () => {
    expect(clampD10Count(0)).toBe(1);
    expect(clampD10Count(-3)).toBe(1);
    expect(clampD10Count(4)).toBe(4);
    expect(clampD10Count(MAX_D10_COUNT + 5)).toBe(MAX_D10_COUNT);
    expect(clampD10Count(Number.NaN)).toBe(1);
  });
});

describe('rollQuickDice', () => {
  it('rolls a single d100', () => {
    const roll = rollQuickDice('d100', 5, () => 0.46);
    expect(roll).toEqual({ mode: 'd100', dice: [47], total: 47 });
  });

  it('rolls the requested number of d10s and sums them', () => {
    const roll = rollQuickDice('d10', 3, sequence(0.6, 0.1, 0.85));
    expect(roll).toEqual({ mode: 'd10', dice: [7, 2, 9], total: 18 });
  });

  it('never rolls more d10s than the maximum', () => {
    expect(rollQuickDice('d10', 99, () => 0).dice).toHaveLength(MAX_D10_COUNT);
  });
});

describe('describeQuickRoll', () => {
  it('names what was rolled', () => {
    expect(describeQuickRoll({ mode: 'd100', dice: [47] })).toBe('d100');
    expect(describeQuickRoll({ mode: 'd10', dice: [4] })).toBe('d10');
    expect(describeQuickRoll({ mode: 'd10', dice: [4, 6, 1] })).toBe('3d10');
  });
});
