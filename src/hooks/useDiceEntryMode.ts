import { useCallback, useEffect, useState } from 'react';

/**
 * Dice-entry mode preference (improvement #11).
 *
 * This is a per-player UI PREFERENCE, not a game mechanic or house rule — it
 * does not change any WFRP4e rule, only how a d100 value reaches the roll
 * resolver. It is therefore stored app-wide in localStorage (mirroring the
 * `nav-collapsed` / theme patterns) rather than on a character.
 *
 * - 'auto'   — the app rolls the d100 for you (default, existing behaviour).
 * - 'manual' — you enter the d100 result from a physical die; the app still
 *              resolves SL, criticals, difficulty, etc. via the same engine.
 */
export type DiceEntryMode = 'auto' | 'manual';

export const DICE_ENTRY_MODE_KEY = 'wfrp-dice-entry-mode';

/** Synchronously read the current dice-entry mode from localStorage. */
export function getDiceEntryMode(): DiceEntryMode {
  try {
    return localStorage.getItem(DICE_ENTRY_MODE_KEY) === 'manual' ? 'manual' : 'auto';
  } catch {
    return 'auto';
  }
}

/** Persist the dice-entry mode. Safe to call in private-browsing / quota states. */
export function setDiceEntryModeStorage(mode: DiceEntryMode): void {
  try {
    localStorage.setItem(DICE_ENTRY_MODE_KEY, mode);
  } catch {
    // Ignore — preference simply won't persist.
  }
}

/**
 * React hook exposing the dice-entry mode and a setter. Keeps multiple mounted
 * consumers (e.g. Settings and an open dialog) in sync within a tab via a
 * custom event, and across tabs via the native `storage` event.
 */
export function useDiceEntryMode(): {
  mode: DiceEntryMode;
  setMode: (mode: DiceEntryMode) => void;
} {
  const [mode, setModeState] = useState<DiceEntryMode>(() => getDiceEntryMode());

  useEffect(() => {
    const sync = () => setModeState(getDiceEntryMode());
    window.addEventListener('storage', sync);
    window.addEventListener('wfrp-dice-entry-mode-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('wfrp-dice-entry-mode-change', sync);
    };
  }, []);

  const setMode = useCallback((next: DiceEntryMode) => {
    setDiceEntryModeStorage(next);
    setModeState(next);
    // Notify other in-tab consumers (the `storage` event only fires cross-tab).
    window.dispatchEvent(new Event('wfrp-dice-entry-mode-change'));
  }, []);

  return { mode, setMode };
}
