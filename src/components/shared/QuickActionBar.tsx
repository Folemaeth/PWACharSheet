import styles from './QuickActionBar.module.css';
import pressableStyles from '../../styles/micro-interactions.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  skillName: string;
  icon?: string;
}

export interface QuickActionBarProps {
  actions: QuickAction[];
  onTrigger: (action: QuickAction) => void;
  /**
   * Presentation variant (#2 — surface Quick Rolls outside combat/mobile):
   * - 'floating' (default): fixed bar above the mobile bottom nav (mobile-only).
   * - 'docked': fixed bottom-centre pill shown on desktop viewports.
   * Each variant is CSS-gated to its own breakpoint, so both can be rendered
   * simultaneously without overlapping.
   */
  variant?: 'floating' | 'docked';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ACTIONS = 6;

// ─── Component ───────────────────────────────────────────────────────────────

export function QuickActionBar({ actions, onTrigger, variant = 'floating' }: QuickActionBarProps) {
  // Hide when no actions configured (Req 21.5)
  if (actions.length === 0) {
    return null;
  }

  // Cap at max 6 actions (Req 21.3)
  const visibleActions = actions.slice(0, MAX_ACTIONS);

  const barClass = variant === 'docked' ? styles.quickActionBarDocked : styles.quickActionBar;

  return (
    <div className={barClass} data-testid="quick-action-bar" data-variant={variant}>
      {variant === 'docked' && (
        <span className={styles.dockedLabel} aria-hidden="true">🎲 Quick Rolls</span>
      )}
      {visibleActions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`${styles.actionButton} ${pressableStyles.pressable}`}
          onClick={() => onTrigger(action)}
          aria-label={`Quick roll ${action.skillName}`}
        >
          {action.icon && <span className={styles.actionIcon}>{action.icon}</span>}
          <span className={styles.actionLabel}>{action.skillName}</span>
        </button>
      ))}
    </div>
  );
}
