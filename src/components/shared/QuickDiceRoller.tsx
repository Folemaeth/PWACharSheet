import { useCallback, useEffect, useRef, useState } from 'react';
import { Dices, Minus, Plus, X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { triggerRollHaptic } from '../../logic/haptics';
import {
  MAX_D10_COUNT,
  MIN_D10_COUNT,
  clampD10Count,
  describeQuickRoll,
  rollQuickDice,
} from '../../logic/quick-dice';
import type { QuickDiceMode, QuickRoll } from '../../logic/quick-dice';
import { ModalOverlay } from './ModalOverlay';
import styles from './QuickDiceRoller.module.css';

export const QUICK_DICE_PREFS_KEY = 'wfrp-quick-dice';

/** How many rolls the panel keeps on screen, newest first. */
const HISTORY_LIMIT = 8;

interface QuickDicePrefs {
  mode: QuickDiceMode;
  count: number;
}

const DEFAULT_PREFS: QuickDicePrefs = { mode: 'd100', count: 2 };

/** Last-used dice, so reopening the roller for the same table or Income is one tap. */
function loadPrefs(): QuickDicePrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(QUICK_DICE_PREFS_KEY) ?? '{}');
    return {
      mode: saved.mode === 'd10' ? 'd10' : 'd100',
      count: clampD10Count(Number(saved.count ?? DEFAULT_PREFS.count)),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: QuickDicePrefs): void {
  try {
    localStorage.setItem(QUICK_DICE_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing or storage full — the choice simply won't persist.
  }
}

interface RollEntry extends QuickRoll {
  id: number;
}

export interface QuickDiceRollerProps {
  onClose: () => void;
}

/**
 * Quick roller opened from the navigation: a d100 for random tables, or a pool
 * of d10s showing every die and their sum. Rolls are not tied to a character
 * and are not written to the roll history.
 */
export function QuickDiceRoller({ onClose }: QuickDiceRollerProps) {
  const [prefs, setPrefs] = useState(loadPrefs);
  const [history, setHistory] = useState<RollEntry[]>([]);
  const nextId = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const rollBtnRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, true);

  // The trap focuses the first control (Close); start on Roll so Enter rolls.
  useEffect(() => {
    rollBtnRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const updatePrefs = (next: QuickDicePrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  const roll = () => {
    const result = rollQuickDice(prefs.mode, prefs.count);
    triggerRollHaptic(false, false);
    setHistory((prev) => [{ ...result, id: nextId.current++ }, ...prev].slice(0, HISTORY_LIMIT));
  };

  const [latest, ...earlier] = history;
  const pendingLabel = describeQuickRoll({
    mode: prefs.mode,
    dice: Array.from({ length: prefs.mode === 'd100' ? 1 : prefs.count }),
  });

  return (
    <ModalOverlay
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Quick dice roller"
    >
      <div ref={panelRef} className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Dices size={18} aria-hidden="true" />
            Quick Roll
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className={styles.modeToggle} role="group" aria-label="Dice type">
          <button
            type="button"
            className={prefs.mode === 'd100' ? styles.modeBtnActive : styles.modeBtn}
            aria-pressed={prefs.mode === 'd100'}
            onClick={() => updatePrefs({ ...prefs, mode: 'd100' })}
          >
            d100
          </button>
          <button
            type="button"
            className={prefs.mode === 'd10' ? styles.modeBtnActive : styles.modeBtn}
            aria-pressed={prefs.mode === 'd10'}
            onClick={() => updatePrefs({ ...prefs, mode: 'd10' })}
          >
            Nd10
          </button>
        </div>

        {prefs.mode === 'd10' && (
          <div className={styles.countRow}>
            <span className={styles.countLabel} id="quick-dice-count-label">Number of d10</span>
            <div className={styles.stepper} role="group" aria-labelledby="quick-dice-count-label">
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => updatePrefs({ ...prefs, count: clampD10Count(prefs.count - 1) })}
                disabled={prefs.count <= MIN_D10_COUNT}
                aria-label="Fewer dice"
              >
                <Minus size={16} />
              </button>
              <output className={styles.countValue} aria-live="polite">{prefs.count}</output>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => updatePrefs({ ...prefs, count: clampD10Count(prefs.count + 1) })}
                disabled={prefs.count >= MAX_D10_COUNT}
                aria-label="More dice"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}

        <div className={styles.result} aria-live="polite">
          {latest ? (
            <div key={latest.id} className={styles.resultBody}>
              <span className={styles.resultLabel}>{describeQuickRoll(latest)}</span>
              {latest.dice.length > 1 && (
                <ul className={styles.diceList} aria-label="Individual dice">
                  {latest.dice.map((die, i) => (
                    <li key={i} className={styles.die}>{die}</li>
                  ))}
                </ul>
              )}
              <span className={styles.total} data-testid="quick-roll-total">
                {latest.dice.length > 1 && <span className={styles.totalPrefix}>Total </span>}
                {latest.total}
              </span>
            </div>
          ) : (
            <span className={styles.placeholder}>No roll yet</span>
          )}
        </div>

        <button ref={rollBtnRef} type="button" className={styles.rollBtn} onClick={roll}>
          Roll {pendingLabel}
        </button>

        {earlier.length > 0 && (
          <section className={styles.history} aria-label="Earlier rolls">
            <h3 className={styles.historyTitle}>Earlier</h3>
            <ol className={styles.historyList}>
              {earlier.map((entry) => (
                <li key={entry.id} className={styles.historyRow}>
                  <span className={styles.historyLabel}>{describeQuickRoll(entry)}</span>
                  <span className={styles.historyTotal}>{entry.total}</span>
                  {entry.dice.length > 1 && (
                    <span className={styles.historyDice}>{entry.dice.join(' + ')}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </ModalOverlay>
  );
}
