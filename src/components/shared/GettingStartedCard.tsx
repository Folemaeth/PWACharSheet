import { useState, useCallback } from 'react';
import { Sparkles, X, User, Dices, Swords, Check, Circle } from 'lucide-react';
import { Card } from './Card';
import { isBrandNewCharacter } from './gettingStartedUtils';
import styles from './GettingStartedCard.module.css';

/**
 * Getting-Started onboarding card (spec: ux-audit-improvements, Req 5).
 *
 * A dismissible, non-modal card shown only for a brand-new character. Offers
 * concise orientation and quick links to set up the character, roll a test, and
 * open Combat. Dismissal is persisted per-character in localStorage so the card
 * is never shown again once dismissed or once the character is no longer
 * brand-new (Req 5.3, 5.5).
 */

const STORAGE_PREFIX = 'wfrp-getting-started-dismissed-';

function isDismissed(characterId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${characterId}`) === 'true';
  } catch {
    return false;
  }
}

function persistDismissal(characterId: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${characterId}`, 'true');
  } catch {
    // Graceful fallback — localStorage unavailable or quota exceeded
  }
}

export interface GettingStartedCardProps {
  characterId: string;
  xpSpent: number;
  career: string;
  /** Focus the identity/setup area to set characteristics and career (Req 5.2a). */
  onSetup: () => void;
  /** Open a test roll (Req 5.2b). */
  onRollTest: () => void;
  /** Navigate to the Combat page (Req 5.2c). */
  onOpenCombat: () => void;
  /**
   * Completion signals for the next-steps checklist (improvement #7). Optional
   * so existing callers keep working; when omitted a step renders as not-yet-done.
   */
  nameSet?: boolean;
  hasCharacteristics?: boolean;
  careerSet?: boolean;
}

export function GettingStartedCard({
  characterId,
  xpSpent,
  career,
  onSetup,
  onRollTest,
  onOpenCombat,
  nameSet = false,
  hasCharacteristics = false,
  careerSet = false,
}: GettingStartedCardProps) {
  // Only brand-new characters that have not been dismissed for this id see the card.
  const [dismissed, setDismissed] = useState(() => isDismissed(characterId));

  const dismiss = useCallback(() => {
    persistDismissal(characterId);
    setDismissed(true);
  }, [characterId]);

  // Never show once dismissed or when the character is no longer brand-new (Req 5.3, 5.5).
  if (dismissed || !isBrandNewCharacter(xpSpent, career)) {
    return null;
  }

  return (
    <Card>
      {/* role="note" keeps the card non-modal — it never traps focus (Req 5.4). */}
      <section className={styles.card} role="note" aria-label="Getting started">
        <div className={styles.header}>
          <span className={styles.titleGroup}>
            <Sparkles size={18} className={styles.titleIcon} aria-hidden="true" />
            <h2 className={styles.title}>Getting started</h2>
          </span>
          <button
            type="button"
            className={styles.dismiss}
            onClick={dismiss}
            aria-label="Dismiss getting started"
            title="Dismiss"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <p className={styles.intro}>
          Welcome to your new character. Work through these steps, then jump into
          combat when you are ready.
        </p>

        {(() => {
          const setupSteps = [
            { key: 'name', label: 'Name your character', done: nameSet },
            { key: 'chars', label: 'Set your characteristics', done: hasCharacteristics },
            { key: 'career', label: 'Choose a career', done: careerSet },
          ];
          const doneCount = setupSteps.filter((s) => s.done).length;
          return (
            <>
              <div className={styles.progress} aria-live="polite">
                Setup: {doneCount} of {setupSteps.length} done
              </div>
              <ul className={styles.checklist}>
                {setupSteps.map((step) => (
                  <li
                    key={step.key}
                    className={step.done ? styles.stepDone : styles.step}
                    data-complete={step.done ? 'true' : 'false'}
                  >
                    {step.done ? (
                      <Check size={16} className={styles.stepCheck} aria-hidden="true" />
                    ) : (
                      <Circle size={16} className={styles.stepCircle} aria-hidden="true" />
                    )}
                    <span className={styles.stepLabel}>{step.label}</span>
                    <span className={styles.srStatus}>
                      {step.done ? ' (done)' : ' (to do)'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}

        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={onSetup}>
            <User size={18} aria-hidden="true" />
            <span>Set characteristics &amp; career</span>
          </button>
          <button type="button" className={styles.action} onClick={onRollTest}>
            <Dices size={18} aria-hidden="true" />
            <span>Roll a test</span>
          </button>
          <button type="button" className={styles.action} onClick={onOpenCombat}>
            <Swords size={18} aria-hidden="true" />
            <span>Open Combat</span>
          </button>
        </div>
      </section>
    </Card>
  );
}
