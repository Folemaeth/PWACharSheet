import { useState } from 'react';
import type { Character, CharacteristicKey, FieldPath, FieldValue } from '../../../types/character';
import { Card } from '../../shared/Card';
import { SectionHeader } from '../../shared/SectionHeader';
import { EditableField } from '../../shared/EditableField';
import { CollapsibleSection } from '../../shared/CollapsibleSection';
import { FortuneResolvePanel } from '../../shared/FortuneResolvePanel';
import { Swords, Footprints, Heart } from 'lucide-react';
import { computeWoundMaximum, getBonus } from '../../../logic/calculators';
import { SPECIES_DATA } from '../../../data/species';
import { CHAR_KEYS, CHAR_FULL_NAMES } from '../characterConstants';
import { CharCurrentCell } from '../CharCurrentCell';
import { TooltipTriggerCell } from '../../shared/TooltipTriggerCell';
import type { BreakdownTooltipState } from '../CharacterBreakdownTooltips';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

interface CharacteristicsSectionProps {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  /** Opens the characteristic roll dialog (stays lifted in the shell). */
  openCharacteristicRoll: (key: CharacteristicKey) => void;
  /**
   * Single-tooltip-at-a-time state, owned by the shell (Lifted_State — Req 5.1,
   * 5.4). The characteristic "Current" cell tooltip and the CB breakdown
   * tooltip are mutually exclusive: opening one closes the other (Req 5.5).
   */
  charTooltip: { key: CharacteristicKey; anchorEl: HTMLElement } | null;
  setCharTooltip: (state: { key: CharacteristicKey; anchorEl: HTMLElement } | null) => void;
  breakdownTooltip: BreakdownTooltipState;
  openBreakdownTooltip: (state: NonNullable<BreakdownTooltipState>) => void;
  closeBreakdownTooltip: () => void;
}

/**
 * Characteristics table + Movement + Wound-Maximum panel extracted verbatim from
 * CharacterPage (spec: character-page-decomposition, seam c — Req 2.1).
 *
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline blocks (Req 3.1, 3.2, 3.3). The
 * `CharCurrentCell` / `TooltipTriggerCell` CB-breakdown wiring is preserved
 * exactly, and the single-tooltip-at-a-time invariant is kept by consuming the
 * shell-owned tooltip state + `openBreakdownTooltip`/`closeBreakdownTooltip`
 * (Req 5.5) — opening the "Current" cell tooltip clears the breakdown tooltip
 * (via `closeBreakdownTooltip`, which is exactly `setBreakdownTooltip(null)`),
 * and opening a breakdown tooltip clears `charTooltip` (via the shell's
 * `openBreakdownTooltip`). None of that state moves into this unit — it stays
 * Lifted_State in the shell.
 *
 * `showTBonus` is strictly single-owner (only this section reads it) so it moves
 * to LOCAL state here (Req 5.4) — it stops being lifted.
 *
 * Calculated-total tooltips are unchanged: the CB total is a breakdown tooltip
 * via the shared Tooltip / TooltipTriggerCell wiring, and the Wound Maximum
 * shows its additive breakdown inline (Req 6.3, 6.4; calculated-totals rule).
 */
export function CharacteristicsSection({
  character,
  update,
  updateCharacter,
  openCharacteristicRoll,
  charTooltip,
  setCharTooltip,
  breakdownTooltip,
  openBreakdownTooltip,
  closeBreakdownTooltip,
}: CharacteristicsSectionProps) {
  // Responsive characteristics table: hide T. Bonus on mobile by default (Req 7.3).
  // Single-owner state — local to this section (spec: character-page-decomposition, Req 5.4).
  const [showTBonus, setShowTBonus] = useState(false);

  return (
    <>
      {/* Characteristics */}
      <Card>
        <SectionHeader icon={Swords} title="Characteristics" />
        <button
          type="button"
          className={styles.showDetailsToggle}
          onClick={() => setShowTBonus((v) => !v)}
          aria-pressed={showTBonus}
        >
          {showTBonus ? 'Hide Details' : 'Show Details'}
        </button>
        <div className={styles.overflowAuto}>
          <div className={`${styles.charGrid}${showTBonus ? '' : ` ${styles.hideTBonus}`}`}>
            {/* Header */}
            <div className={styles.charGridHeader}>
              <span>Char</span>
              <span>Initial</span>
              <span>Advance</span>
              <span>Current</span>
              <span>CB</span>
              {showTBonus && <span>T. Bonus</span>}
              <span></span>
            </div>
            {/* Rows */}
            {CHAR_KEYS.map((key) => {
              const c = character.chars[key];
              const current = c.i + c.a + c.b;
              return (
                <div key={key} className={styles.charGridRow}>
                  <div className={styles.charGridKey} title={CHAR_FULL_NAMES[key]}>{key}</div>
                  <div>
                    <input type="number" value={c.i} onChange={(e) => update(`chars.${key}.i`, Number(e.target.value) || 0)} className={styles.numInput} />
                  </div>
                  <div>
                    <input type="number" value={c.a} onChange={(e) => update(`chars.${key}.a`, Number(e.target.value) || 0)} className={styles.numInput} />
                  </div>
                  <CharCurrentCell
                    charKey={key}
                    current={current}
                    isTooltipOpen={charTooltip?.key === key}
                    onOpen={(k, el) => { setCharTooltip({ key: k, anchorEl: el }); closeBreakdownTooltip(); }}
                    onClose={() => setCharTooltip(null)}
                  />
                  <TooltipTriggerCell
                    tooltipId={`tooltip-breakdown-cb-${key}`}
                    displayValue={getBonus(current)}
                    isTooltipOpen={breakdownTooltip?.type === 'cb' && breakdownTooltip.key === key}
                    onOpen={(anchorEl) => openBreakdownTooltip({ type: 'cb', key, anchorEl })}
                    onClose={closeBreakdownTooltip}
                    className={styles.charGridCB}
                    ariaLabel={`CB breakdown for ${CHAR_FULL_NAMES[key]}`}
                  />
                  {showTBonus && <div className={c.b > 0 ? styles.charGridBonusActive : styles.charGridBonusInactive}>{c.b || '—'}</div>}
                  <div>
                    <button type="button" className={styles.diceBtn} onClick={() => openCharacteristicRoll(key)} title={`Roll ${CHAR_FULL_NAMES[key]}`} aria-label={`Roll ${CHAR_FULL_NAMES[key]}`}>🎲</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Movement, Fortune/Resolve */}
      <div className={styles.movementFortuneGrid}>
        <Card>
          <SectionHeader icon={Footprints} title="Movement" />
          <div className={styles.movementFields}>
            <EditableField label="Move" value={character.move.m} type="number" onSave={(v) => update('move.m', Number(v) || 0)} />
            <EditableField label="Walk" value={character.move.w} type="number" onSave={(v) => update('move.w', Number(v) || 0)} />
            <EditableField label="Run" value={character.move.r} type="number" onSave={(v) => update('move.r', Number(v) || 0)} />
          </div>
        </Card>
        <FortuneResolvePanel character={character} update={update} updateCharacter={updateCharacter} />
      </div>

      {/* Wound Maximum Formula */}
      <CollapsibleSection title="Wound Maximum" storageKey="collapsible-wound-max" defaultExpanded={true}>
      {(() => {
        // Wound maximum = SB + 2×TB + WPB (+ Hardy), species-multiplied.
        // Core p.36 "Wounds"; formula copied verbatim from the shell — no
        // mechanics change (spec: rules-compliance).
        const S = character.chars.S.i + character.chars.S.a + character.chars.S.b;
        const T = character.chars.T.i + character.chars.T.a + character.chars.T.b;
        const WP = character.chars.WP.i + character.chars.WP.a + character.chars.WP.b;
        const hardyTalent = character.talents.find(t => t.n === 'Hardy');
        const hardyLvl = hardyTalent ? hardyTalent.lvl : 0;
        const speciesWoundData = character.species ? SPECIES_DATA[character.species] : undefined;
        const woundMult = speciesWoundData?.woundMultiplier ?? 1;
        const woundResult = computeWoundMaximum(S, T, WP, hardyLvl, character.woundsUseSB, woundMult);
        const effectiveMax = character.eMaxOverride != null ? character.eMaxOverride : woundResult.total;

        const formulaParts: string[] = [];
        if (character.woundsUseSB) formulaParts.push(`SB ${woundResult.sb}`);
        formulaParts.push(`2×TB ${woundResult.tb}`);
        formulaParts.push(`WPB ${woundResult.wpb}`);
        if (hardyLvl > 0) formulaParts.push(`Hardy ${woundResult.hardy}`);

        return (
          <Card>
            <SectionHeader icon={Heart} title="Wound Maximum" />
            <div className={styles.woundFormulaSection}>
              <div className={styles.woundFormulaValue}>
                <span className={styles.woundFormulaTotal}>{effectiveMax}</span>
                {character.eMaxOverride != null && (
                  <span className={styles.woundFormulaOverride}>(override)</span>
                )}
              </div>
              <div className={styles.woundFormulaBreakdown}>
                {formulaParts.join(' + ')} = {woundResult.total}
              </div>
              {character.eMaxOverride != null && (
                <div className={styles.woundFormulaCalculated}>
                  Calculated: {woundResult.total}
                </div>
              )}
              <div className={styles.woundFormulaOverrideField}>
                <label className={styles.woundOverrideLabel}>
                  Override
                  <input
                    type="number"
                    value={character.eMaxOverride ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : Number(e.target.value);
                      update('eMaxOverride', val);
                    }}
                    placeholder="—"
                    className={styles.woundOverrideInput}
                  />
                </label>
              </div>
            </div>
          </Card>
        );
      })()}
      </CollapsibleSection>
    </>
  );
}
