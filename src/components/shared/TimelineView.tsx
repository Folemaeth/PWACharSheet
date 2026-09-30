/**
 * TimelineView — renders the unified event log (`character.eventLog`).
 *
 * Display/audit only: this component never reads the log to reconstruct
 * mechanics. It shows events reverse-chronological (the store is oldest-first;
 * we map + reverse for display), offers a category filter as toggle chips, and
 * a confirm-guarded clear control.
 *
 * See spec: .kiro/specs/unified-event-log (design.md §5 "TimelineView").
 * _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_
 */
import { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import type { LogCategory, LogEvent, RollEventPayload } from '../../types/character';
import { filterByCategory } from '../../logic/event-log';
import { EmptyState } from './EmptyState';
import { ConfirmDialog } from './ConfirmDialog';
import styles from './TimelineView.module.css';

interface TimelineViewProps {
  events: LogEvent[];
  onClear: () => void;
}

/** The defined categories, in a stable display order. (Req 1.3, 8.3) */
const CATEGORIES: LogCategory[] = [
  'roll',
  'advancement',
  'combat',
  'wealth',
  'condition',
  'session',
  'system',
];

/** Human-readable labels for the filter chips. */
const CATEGORY_LABELS: Record<LogCategory, string> = {
  roll: 'Roll',
  advancement: 'Advancement',
  combat: 'Combat',
  wealth: 'Wealth',
  condition: 'Condition',
  session: 'Session',
  system: 'System',
};

/** Format a ms-since-epoch timestamp into a readable local string. (Req 8.2) */
function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

/**
 * A "notable" roll is a critical success or a fumble (improvement #6). These are
 * the rolls worth keeping in a session narrative; ordinary rolls are noise.
 */
function isNotableRoll(event: LogEvent): boolean {
  if (event.category !== 'roll') return false;
  const p = event.payload as Partial<RollEventPayload>;
  return Boolean(p.isCritical) || Boolean(p.isFumble);
}

export function TimelineView({ events, onClear }: TimelineViewProps) {
  // Selected categories; empty set means "show all" (filterByCategory handles this). (Req 8.4)
  const [selected, setSelected] = useState<Set<LogCategory>>(new Set());
  const [confirmingClear, setConfirmingClear] = useState(false);
  // Opt-in declutter (#6): when on, roll events are limited to notable ones
  // (crits/fumbles). Non-roll categories are unaffected.
  const [notableRollsOnly, setNotableRollsOnly] = useState(false);

  const toggleCategory = (category: LogCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Filter by selected categories, optionally limit rolls to notable ones, then
  // reverse for newest-first display. (Req 8.1, 8.3; improvement #6)
  const displayEvents = useMemo(() => {
    let filtered = filterByCategory(events, selected);
    if (notableRollsOnly) {
      filtered = filtered.filter((e) => e.category !== 'roll' || isNotableRoll(e));
    }
    return filtered.slice().reverse();
  }, [events, selected, notableRollsOnly]);

  const handleConfirmClear = () => {
    onClear();
    setConfirmingClear(false);
  };

  return (
    <div className={styles.container}>
      {/* Category filter chips (Req 8.3, 8.4) */}
      <div className={styles.filterBar} role="group" aria-label="Filter by category">
        {CATEGORIES.map((category) => {
          const active = selected.has(category);
          return (
            <button
              key={category}
              type="button"
              className={active ? styles.chipActive : styles.chip}
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
            >
              {CATEGORY_LABELS[category]}
            </button>
          );
        })}
      </div>

      {/* Opt-in declutter: notable rolls only (improvement #6) */}
      <label className={styles.notableToggle}>
        <input
          type="checkbox"
          checked={notableRollsOnly}
          onChange={(e) => setNotableRollsOnly(e.target.checked)}
        />
        <span>Notable rolls only (criticals &amp; fumbles)</span>
      </label>

      {displayEvents.length === 0 ? (
        <EmptyState
          icon={History}
          heading="No events yet"
          description="Rolls, advancements, wealth changes, and combat actions will appear here."
        />
      ) : (
        <>
          <ul className={styles.eventList}>
            {displayEvents.map((event) => (
              <li key={event.id} className={styles.event}>
                <span className={styles.summary}>{event.summary}</span>
                <span className={styles.timestamp}>{formatTimestamp(event.timestamp)}</span>
              </li>
            ))}
          </ul>
          {/* Clear control (Req 9.1, 9.2) */}
          <button type="button" className={styles.clearBtn} onClick={() => setConfirmingClear(true)}>
            Clear
          </button>
        </>
      )}

      {confirmingClear && (
        <ConfirmDialog
          message="Clear the event log? This cannot be undone."
          confirmLabel="Clear"
          cancelLabel="Cancel"
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmingClear(false)}
        />
      )}
    </div>
  );
}
