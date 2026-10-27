/**
 * Free-standing dice for the navigation's quick roller: a bare d100 for random
 * tables, or a pool of d10s (Income, Endeavours) summed. No target number, no
 * SL — those belong to the test roll pipeline in `dice-roller.ts`.
 */

/** Random-number source: a function returning a float in [0, 1), like Math.random. */
export type Rng = () => number;

export type QuickDiceMode = 'd100' | 'd10';

export const MIN_D10_COUNT = 1;
export const MAX_D10_COUNT = 20;

export interface QuickRoll {
  mode: QuickDiceMode;
  /** Each die as it came up. A d100 roll holds its single result. */
  dice: number[];
  total: number;
}

export function rollDie(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

/** Keep a d10 pool size within what the roller offers. */
export function clampD10Count(count: number): number {
  if (!Number.isFinite(count)) return MIN_D10_COUNT;
  return Math.min(MAX_D10_COUNT, Math.max(MIN_D10_COUNT, Math.round(count)));
}

export function rollQuickDice(mode: QuickDiceMode, count: number, rng: Rng = Math.random): QuickRoll {
  const dice = mode === 'd100'
    ? [rollDie(100, rng)]
    : Array.from({ length: clampD10Count(count) }, () => rollDie(10, rng));
  return { mode, dice, total: dice.reduce((sum, die) => sum + die, 0) };
}

/** Short name of what was rolled: "d100", "d10", "3d10". */
export function describeQuickRoll(roll: Pick<QuickRoll, 'mode' | 'dice'>): string {
  if (roll.mode === 'd100') return 'd100';
  return roll.dice.length === 1 ? 'd10' : `${roll.dice.length}d10`;
}
