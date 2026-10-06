import { useRef, useState } from 'react';
import {
  performRoll,
  applyDifficulty,
  resolveOpposedTest,
  sumExtendedSL,
  type DifficultyLevel,
  type RollResult,
  type OpposedTestResult,
} from '../../logic/dice-roller';
import { triggerRollHaptic } from '../../logic/haptics';
import { getDiceEntryMode, type DiceEntryMode } from '../../hooks/useDiceEntryMode';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useRollModifierMemory } from '../../hooks/useRollModifierMemory';
import { ModalOverlay } from './ModalOverlay';
import styles from './RollDialog.module.css';

interface RollDialogProps {
  skillOrCharName: string;
  baseTarget: number;
  defaultDifficulty?: DifficultyLevel;
  onRoll: (result: RollResult) => void;
  onClose: () => void;
  /**
   * Override the dice-entry mode. Defaults to the persisted player preference
   * (`useDiceEntryMode`). Exposed mainly for tests; production callers rely on
   * the preference.
   */
  diceEntryMode?: DiceEntryMode;
  /**
   * Several skills that could make this test (e.g. one Channelling skill per
   * Wind). With two or more options a Skill dropdown is shown; the caller
   * passes the chosen skill back in as `skillOrCharName` and `baseTarget`.
   */
  skillChoice?: {
    options: { name: string; target: number }[];
    onChange: (name: string) => void;
  };
  /**
   * Whether the test can be made an Extended Test (repeated rolls with a running
   * SL total). Turn off for dialogs whose single result feeds something else,
   * such as casting and channelling.
   */
  allowExtended?: boolean;
  /**
   * Called for each roll of an Extended Test, in place of `onRoll`, so the
   * caller can log it while the dialog stays open for the next roll.
   */
  onExtendedRoll?: (result: RollResult) => void;
}

const DIFFICULTY_LABELS: { level: DifficultyLevel; label: string }[] = [
  { level: 'Very Easy', label: 'Very Easy (+60)' },
  { level: 'Easy', label: 'Easy (+40)' },
  { level: 'Average', label: 'Average (+20)' },
  { level: 'Challenging', label: 'Challenging (+0)' },
  { level: 'Difficult', label: 'Difficult (-10)' },
  { level: 'Hard', label: 'Hard (-20)' },
  { level: 'Very Hard', label: 'Very Hard (-30)' },
];

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

/** Text for a modifier field: no modifier (or a saved 0) shows as empty. */
function modifierText(modifier: number | undefined): string {
  return modifier ? String(modifier) : '';
}

function getWinnerLabel(winner: OpposedTestResult['winner']): string {
  if (winner === 'player') return 'You win!';
  if (winner === 'opponent') return 'Opponent wins!';
  return 'Tie!';
}

export function RollDialog({
  skillOrCharName,
  baseTarget,
  defaultDifficulty = 'Challenging',
  onRoll,
  onClose,
  diceEntryMode,
  skillChoice,
  allowExtended = true,
  onExtendedRoll,
}: RollDialogProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(defaultDifficulty);
  // Flat bonuses or penalties from talents, items or spell effects; empty = 0.
  // The target modifier stacks with the difficulty, the SL modifier shifts the result.
  // Both start from what this skill was last rolled with, as they rarely change.
  const { saved: savedModifiers, remember: rememberModifiers } = useRollModifierMemory();
  const [targetModifierInput, setTargetModifierInput] = useState(
    () => modifierText(savedModifiers[skillOrCharName]?.targetModifier)
  );
  const [slModifierInput, setSlModifierInput] = useState(
    () => modifierText(savedModifiers[skillOrCharName]?.slModifier)
  );
  const [opposedMode, setOpposedMode] = useState(false);
  const [opponentTarget, setOpponentTarget] = useState('');
  const [opposedResult, setOpposedResult] = useState<OpposedTestResult | null>(null);
  // Extended Test: the dialog stays open and each roll adds its SL to a running
  // total until the player finishes.
  const [extendedMode, setExtendedMode] = useState(false);
  const [extendedRolls, setExtendedRolls] = useState<RollResult[]>([]);
  const extendedInProgress = extendedRolls.length > 0;
  // Manual dice entry (improvement #11): read the persisted preference once on
  // mount unless the caller overrides it. Manual entry lets players who roll
  // physical dice type the d100 result while still using the app's resolver.
  const [entryMode] = useState<DiceEntryMode>(() => diceEntryMode ?? getDiceEntryMode());
  const isManual = entryMode === 'manual';
  const [manualRoll, setManualRoll] = useState('');
  const [manualOpponentRoll, setManualOpponentRoll] = useState('');
  const [manualError, setManualError] = useState('');

  // Focus trap + return-focus for keyboard/screen-reader users (#9).
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const targetModifier = parseInt(targetModifierInput, 10) || 0;
  const slModifier = parseInt(slModifierInput, 10) || 0;
  const modifiedTarget = applyDifficulty(baseTarget, difficulty) + targetModifier;

  /** Parse and validate a manually-entered d100 value (1–100). */
  const parseManualRoll = (raw: string): number | null => {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > 100) return null;
    return n;
  };

  const handleRoll = () => {
    setManualError('');

    let rollValue: number;
    if (isManual) {
      const parsed = parseManualRoll(manualRoll);
      if (parsed === null) {
        setManualError('Enter a d100 result between 1 and 100.');
        return;
      }
      rollValue = parsed;
    } else {
      rollValue = Math.floor(Math.random() * 100) + 1;
    }

    const result = performRoll(baseTarget, difficulty, skillOrCharName, rollValue, { targetModifier, slModifier });
    triggerRollHaptic(result.isCritical, result.isFumble);

    if (extendedMode) {
      // Keep the dialog open: add the roll to the running total and wait for the next
      rememberModifiers(skillOrCharName, { targetModifier, slModifier });
      setExtendedRolls((rolls) => [...rolls, result]);
      setManualRoll('');
      onExtendedRoll?.(result);
      return;
    }

    if (opposedMode && opponentTarget !== '') {
      const oppTarget = parseInt(opponentTarget, 10);
      if (!isNaN(oppTarget) && oppTarget >= 1) {
        let opponentRollValue: number;
        if (isManual) {
          const parsedOpp = parseManualRoll(manualOpponentRoll);
          if (parsedOpp === null) {
            setManualError("Enter the opponent's d100 result between 1 and 100.");
            return;
          }
          opponentRollValue = parsedOpp;
        } else {
          opponentRollValue = Math.floor(Math.random() * 100) + 1;
        }
        const opposed = resolveOpposedTest(
          result.targetNumber,
          result.roll,
          oppTarget,
          opponentRollValue,
          slModifier
        );
        setOpposedResult(opposed);
        rememberModifiers(skillOrCharName, { targetModifier, slModifier });
        // Still report the player roll for history tracking
        onRoll(result);
        return;
      }
    }

    rememberModifiers(skillOrCharName, { targetModifier, slModifier });
    onRoll(result);
  };

  /** Switch to another skill for this test; each skill has its own remembered modifiers. */
  const chooseSkill = (name: string) => {
    skillChoice?.onChange(name);
    setTargetModifierInput(modifierText(savedModifiers[name]?.targetModifier));
    setSlModifierInput(modifierText(savedModifiers[name]?.slModifier));
  };

  // When showing opposed result, render the result view instead of the form
  if (opposedResult) {
    return (
      <ModalOverlay className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Opposed Test Result">
        <div ref={dialogRef} className={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.title}>{skillOrCharName} — Opposed Test</h2>

          <div className={styles.opposedResultSection}>
            <div className={styles.opposedRow}>
              <span className={styles.opposedParty}>You</span>
              <span className={styles.opposedSl}>SL {formatSL(opposedResult.playerSL)}</span>
              <span className={styles.opposedRollValue}>({opposedResult.playerRoll})</span>
            </div>
            <div className={styles.opposedRow}>
              <span className={styles.opposedParty}>Opponent</span>
              <span className={styles.opposedSl}>SL {formatSL(opposedResult.opponentSL)}</span>
              <span className={styles.opposedRollValue}>({opposedResult.opponentRoll})</span>
            </div>

            <div className={styles.opposedSeparator} />

            <div className={styles.opposedNetRow}>
              <span className={styles.opposedNetLabel}>Net SL</span>
              <span className={styles.opposedNetValue}>{formatSL(opposedResult.netSL)}</span>
            </div>

            <div
              className={`${styles.opposedWinner} ${
                opposedResult.winner === 'player'
                  ? styles.winnerPlayer
                  : opposedResult.winner === 'opponent'
                    ? styles.winnerOpponent
                    : styles.winnerTie
              }`}
            >
              {getWinnerLabel(opposedResult.winner)}
            </div>
          </div>

          <button type="button" onClick={onClose} className={styles.rollBtn}>
            Dismiss
          </button>
        </div>
      </ModalOverlay>
    );
  }

  return (
    <ModalOverlay className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Roll Dialog">
      <div ref={dialogRef} className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{skillOrCharName}</h2>

        {skillChoice && skillChoice.options.length > 1 && (
          <div>
            <div className={styles.label}>Skill</div>
            <select
              className={styles.select}
              value={skillOrCharName}
              onChange={(e) => chooseSkill(e.target.value)}
              aria-label="Skill"
            >
              {skillChoice.options.map(({ name, target }) => (
                <option key={name} value={name}>
                  {name} — {target}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <div className={styles.label}>Base Target</div>
          <div className={styles.value}>{baseTarget}</div>
        </div>

        <div>
          <div className={styles.label}>Difficulty</div>
          <select
            className={styles.select}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
            aria-label="Difficulty"
          >
            {DIFFICULTY_LABELS.map(({ level, label }) => (
              <option key={level} value={level}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.modifierRow}>
          <div className={styles.modifierField}>
            <div className={styles.label}>Target Modifier</div>
            <input
              type="number"
              className={styles.opponentInput}
              value={targetModifierInput}
              onChange={(e) => setTargetModifierInput(e.target.value)}
              placeholder="0"
              aria-label="Target Modifier"
            />
          </div>
          <div className={styles.modifierField}>
            <div className={styles.label}>SL Modifier</div>
            <input
              type="number"
              className={styles.opponentInput}
              value={slModifierInput}
              onChange={(e) => setSlModifierInput(e.target.value)}
              placeholder="0"
              aria-label="SL Modifier"
            />
          </div>
        </div>

        <div>
          <div className={styles.label}>Modified Target</div>
          <div className={styles.modifiedTarget}>{modifiedTarget}</div>
        </div>

        {/* Manual dice entry (improvement #11) */}
        {isManual && (
          <div>
            <div className={styles.label}>Your d100 Roll</div>
            <input
              type="number"
              className={styles.opponentInput}
              value={manualRoll}
              onChange={(e) => setManualRoll(e.target.value)}
              placeholder="1–100"
              min={1}
              max={100}
              aria-label="Your d100 roll"
              autoFocus
            />
          </div>
        )}

        {/* Opposed / Extended Test Toggles — one or the other, fixed once an Extended Test is under way */}
        <div className={styles.opposedToggleSection}>
          <div className={styles.toggleRow}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={opposedMode}
                disabled={extendedInProgress}
                onChange={(e) => {
                  setOpposedMode(e.target.checked);
                  if (e.target.checked) setExtendedMode(false);
                  else setOpposedResult(null);
                }}
                className={styles.toggleCheckbox}
                aria-label="Opposed Test"
              />
              <span className={styles.toggleText}>Opposed Test</span>
            </label>
            {allowExtended && (
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={extendedMode}
                  disabled={extendedInProgress}
                  onChange={(e) => {
                    setExtendedMode(e.target.checked);
                    if (e.target.checked) setOpposedMode(false);
                  }}
                  className={styles.toggleCheckbox}
                  aria-label="Extended Test"
                />
                <span className={styles.toggleText}>Extended Test</span>
              </label>
            )}
          </div>

          {opposedMode && (
            <div className={styles.opponentTargetField}>
              <div className={styles.label}>Opponent Target Number</div>
              <input
                type="number"
                className={styles.opponentInput}
                value={opponentTarget}
                onChange={(e) => setOpponentTarget(e.target.value)}
                placeholder="Target"
                min={1}
                max={200}
                aria-label="Opponent Target Number"
              />
              {isManual && (
                <div className={styles.opponentTargetField}>
                  <div className={styles.label}>Opponent's d100 Roll</div>
                  <input
                    type="number"
                    className={styles.opponentInput}
                    value={manualOpponentRoll}
                    onChange={(e) => setManualOpponentRoll(e.target.value)}
                    placeholder="1–100"
                    min={1}
                    max={100}
                    aria-label="Opponent d100 roll"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extended Test running total, newest roll first */}
        {extendedInProgress && (
          <div className={styles.extendedSection}>
            <div className={styles.opposedNetRow} aria-live="polite">
              <span className={styles.opposedNetLabel}>
                Total SL after {extendedRolls.length} {extendedRolls.length === 1 ? 'roll' : 'rolls'}
              </span>
              <span className={styles.opposedNetValue}>{formatSL(sumExtendedSL(extendedRolls))}</span>
            </div>
            <ol className={styles.extendedRolls} aria-label="Extended Test rolls">
              {extendedRolls.map((roll, index) => (
                <li key={index} className={styles.extendedRoll}>
                  <span>#{index + 1}</span>
                  <span>{roll.roll} vs {roll.targetNumber}</span>
                  {/* Doubles: a Critical on a passed roll, a Fumble on a failed one */}
                  {roll.isCritical && <span className={styles.extendedCritical}>Critical</span>}
                  {roll.isFumble && <span className={styles.extendedFumble}>Fumble</span>}
                  <span className={`${styles.extendedRollSl} ${roll.passed ? styles.extendedPass : styles.extendedFail}`}>
                    SL {formatSL(roll.sl)} {roll.passed ? 'Pass' : 'Fail'}
                  </span>
                </li>
              )).reverse()}
            </ol>
          </div>
        )}

        {manualError && (
          <div className={styles.manualError} role="alert" aria-live="polite">
            {manualError}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            {extendedInProgress ? 'Finish' : 'Cancel'}
          </button>
          <button type="button" onClick={handleRoll} className={styles.rollBtn}>
            {isManual ? 'Resolve' : extendedInProgress ? 'Roll Again' : 'Roll'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
