import { createContext, useContext } from 'react';
import type { RollModifiers } from '../logic/dice-roller';

/**
 * The modifiers the active character last rolled each skill or characteristic
 * with, and a way to record new ones. Provided once in App so every RollDialog
 * remembers modifiers without each caller passing them down.
 */
export interface RollModifierMemory {
  /** Saved modifiers keyed by skill or characteristic name. */
  saved: Record<string, RollModifiers>;
  remember: (name: string, modifiers: RollModifiers) => void;
}

// Outside a provider nothing is remembered.
const defaultValue: RollModifierMemory = {
  saved: {},
  remember: () => {},
};

export const RollModifierMemoryContext = createContext<RollModifierMemory>(defaultValue);

export function useRollModifierMemory(): RollModifierMemory {
  return useContext(RollModifierMemoryContext);
}
