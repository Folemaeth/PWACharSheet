import { useState } from 'react';
import type { Character, LedgerEntry } from '../../../types/character';
import { transferFunds, type CurrencyDelta } from '../../../logic/currency';
import { mirrorLedger } from '../../../logic/event-log-mirrors';

interface UseWealthTransferOptions {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/**
 * Wealth → Treasury deposit logic extracted from CharacterPage (seam h).
 *
 * Owns the `depositError` inline-error state and the `applyTransfer` deposit
 * handler that previously lived in the shell. Returns
 * `{ applyTransfer, depositError, setDepositError }` so the shell can wire them
 * into the existing TransferControl JSX.
 *
 * Behaviour-preserving (spec: character-page-decomposition, Req 8.4 — this is
 * state-safety / wealth-treasury-transfer critical): the `applyTransfer`
 * mutation body below is copied VERBATIM from the pre-refactor inline handler.
 * The denomination math, the single `updateCharacter` commit, the 'income'
 * LedgerEntry shape, and the `mirrorLedger` follow-on are unchanged — no
 * mutation-logic change.
 */
export function useWealthTransfer({ character, updateCharacter }: UseWealthTransferOptions) {
  // ─── Wealth → Treasury deposit (wealth-treasury-transfer spec) ──────────────
  // Inline error shown in the Wealth section when a deposit is blocked.
  const [depositError, setDepositError] = useState<string | null>(null);

  /**
   * Apply a coin transfer from Personal Wealth into the estate Treasury
   * (wealth-treasury-transfer design §"Atomic mutation — applyTransfer").
   *
   * Only the 'deposit' direction is handled here; the withdraw side lives on
   * EstatePage. On success this performs a SINGLE updateCharacter mutation that
   * writes both pools (wGC/wSS/wD + estate.treasury), appends one 'income'
   * LedgerEntry, and mirrors the 'wealth' event log entry (Req 7.1). On failure
   * it sets the inline error and mutates nothing (Req 1.4, 3.4, 7.2).
   */
  const applyTransfer = (_direction: 'deposit', amount: CurrencyDelta) => {
    const wealth: CurrencyDelta = { gc: character.wGC || 0, ss: character.wSS || 0, d: character.wD || 0 };
    const treasury: CurrencyDelta = {
      gc: character.estate.treasury?.gc || 0,
      ss: character.estate.treasury?.ss || 0,
      d: character.estate.treasury?.d || 0,
    };

    // Deposit: source = personal wealth, destination = treasury (Req 1.2).
    const result = transferFunds(wealth, treasury, amount);
    if (!result.ok) {
      setDepositError(
        result.reason === 'zero-amount'
          ? 'Enter an amount greater than zero.'
          : 'Insufficient funds — this transfer would overdraw your Coin Purse.',
      );
      return; // Nothing changes anywhere (Req 1.4, 3.4, 7.2).
    }
    setDepositError(null);

    const newWealth = result.source;
    const newTreasury = result.destination;

    // Treasury GAINS coin on a deposit → LedgerEntry type 'income'
    // (design Decision 2: type is from the Treasury's perspective). The amount
    // is the exact per-denomination delta moved (design Decision 1).
    const entry: LedgerEntry = {
      timestamp: Date.now(),
      type: 'income',
      description: 'Transfer: Personal Wealth → Treasury',
      amount,
    };

    // SINGLE mutation: both pools + ledger + event log move together (Req 7.1).
    // Writing wGC/wSS/wD triggers the existing coinWeight recompute (Req 5.1).
    const withPoolsAndLedger: Character = {
      ...character,
      wGC: newWealth.gc,
      wSS: newWealth.ss,
      wD: newWealth.d,
      estate: {
        ...character.estate,
        treasury: newTreasury,
        ledger: [...(character.estate.ledger ?? []), entry],
      },
    };
    // Follow-on display/audit mirror → appends the 'wealth' event (Req 3.3).
    const next = mirrorLedger(withPoolsAndLedger, entry);
    // Single commit: the always-current ref (set synchronously inside commit)
    // makes the post-move state the save source of truth, so no explicit
    // synchronous flush is needed here (spec: state-safety-core, Req 4.3/5.2).
    updateCharacter(() => next);
  };

  return { applyTransfer, depositError, setDepositError };
}
