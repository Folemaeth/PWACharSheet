import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWealthTransfer } from '../useWealthTransfer';
import { BLANK_CHARACTER } from '../../../../types/character';
import type { Character } from '../../../../types/character';
import type { CurrencyDelta } from '../../../../logic/currency';

/**
 * Additive unit tests for the extracted `useWealthTransfer` hook
 * (spec: character-page-decomposition, seam h; Task 4).
 *
 * These tests protect the VERBATIM-copied `applyTransfer` mutation:
 *  - the deposit math (both pools) + the appended 'income' ledger entry +
 *    the mirrored 'wealth' event log entry, and
 *  - the failure path (insufficient funds / zero amount): NOTHING is mutated
 *    and `depositError` is set to the correct inline message.
 *
 * They are new files only — no existing assertion is modified.
 */

const TEST_AMOUNT: CurrencyDelta = { gc: 2, ss: 5, d: 10 };

/** A character seeded with coin in both the purse and the treasury. */
function seededCharacter(): Character {
  const base = structuredClone(BLANK_CHARACTER);
  base.name = 'Wealth Transfer Test';
  base.wGC = 10;
  base.wSS = 20;
  base.wD = 30;
  base.estate.treasury = { gc: 5, ss: 5, d: 5 };
  base.estate.ledger = [];
  base.eventLog = [];
  return base;
}

describe('useWealthTransfer — deposit math + ledger + mirrored event', () => {
  it('applies the deposit through a single updateCharacter mutation', () => {
    const character = seededCharacter();
    // Capture the mutator's committed result exactly as the shell would.
    let committed: Character | null = null;
    const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
      committed = mutator(character);
    });

    const { result } = renderHook(() => useWealthTransfer({ character, updateCharacter }));

    act(() => {
      result.current.applyTransfer('deposit', TEST_AMOUNT);
    });

    // Exactly one commit.
    expect(updateCharacter).toHaveBeenCalledTimes(1);
    expect(committed).not.toBeNull();
    const next = committed as unknown as Character;

    // Purse decreased by the deposited amount: {10,20,30} - {2,5,10}.
    expect({ gc: next.wGC, ss: next.wSS, d: next.wD }).toEqual({ gc: 8, ss: 15, d: 20 });
    // Treasury increased by the deposited amount: {5,5,5} + {2,5,10}.
    expect(next.estate.treasury).toEqual({ gc: 7, ss: 10, d: 15 });

    // One appended ledger entry of type 'income' with the exact amount.
    expect(next.estate.ledger).toHaveLength(1);
    const entry = next.estate.ledger![0];
    expect(entry.type).toBe('income');
    expect(entry.description).toBe('Transfer: Personal Wealth → Treasury');
    expect(entry.amount).toEqual(TEST_AMOUNT);

    // The 'wealth' event log mirror was appended.
    const wealthEvents = (next.eventLog ?? []).filter((e) => e.category === 'wealth');
    expect(wealthEvents).toHaveLength(1);
    expect(wealthEvents[0].type).toBe('wealth.mirror');

    // Error is cleared on success.
    expect(result.current.depositError).toBeNull();
  });
});

describe('useWealthTransfer — failure path mutates nothing', () => {
  it('sets the insufficient-funds error and does NOT mutate on overdraw', () => {
    const character = seededCharacter();
    const updateCharacter = vi.fn();

    const { result } = renderHook(() => useWealthTransfer({ character, updateCharacter }));

    // Deposit more than the purse holds → overdraw.
    act(() => {
      result.current.applyTransfer('deposit', { gc: 999, ss: 0, d: 0 });
    });

    // Nothing committed.
    expect(updateCharacter).not.toHaveBeenCalled();
    expect(result.current.depositError).toBe(
      'Insufficient funds — this transfer would overdraw your Coin Purse.',
    );
  });

  it('sets the zero-amount error and does NOT mutate on a zero transfer', () => {
    const character = seededCharacter();
    const updateCharacter = vi.fn();

    const { result } = renderHook(() => useWealthTransfer({ character, updateCharacter }));

    act(() => {
      result.current.applyTransfer('deposit', { gc: 0, ss: 0, d: 0 });
    });

    expect(updateCharacter).not.toHaveBeenCalled();
    expect(result.current.depositError).toBe('Enter an amount greater than zero.');
  });
});
