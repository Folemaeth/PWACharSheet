import type { Character } from '../../../types/character';
import { Heart, Swords } from 'lucide-react';
import { computeWoundMaximum } from '../../../logic/calculators';
import { SPECIES_DATA } from '../../../data/species';
import { CHAR_KEYS } from '../characterConstants';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

interface CompactSummaryProps {
  character: Character;
}

/**
 * Compact_Mode summary block extracted verbatim from CharacterPage (seam a).
 *
 * Pure render — no state. Shows name/species/career, the wound total (via
 * `computeWoundMaximum`), the characteristics grid, and equipped weapons.
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline block (Req 3.1, 3.2, 3.3).
 */
export function CompactSummary({ character }: CompactSummaryProps) {
  return (
    <div className={styles.compactSummary}>
      <div className={styles.compactHeader}>
        <span className={styles.compactName}>{character.name || '(Unnamed)'}</span>
        <span className={styles.compactMeta}>
          {[character.species, character.career].filter(Boolean).join(' · ')}
        </span>
      </div>
      <div className={styles.compactWounds}>
        <Heart size={14} aria-hidden="true" />
        <span>Wounds: <strong>{character.wCur}</strong> / {(() => {
          // Wound maximum = SB + 2×TB + WPB (+ Hardy), species-multiplied.
          // Core p.36 "Wounds"; formula copied verbatim from the shell —
          // no mechanics change (spec: rules-compliance).
          const S = character.chars.S.i + character.chars.S.a + character.chars.S.b;
          const T = character.chars.T.i + character.chars.T.a + character.chars.T.b;
          const WP = character.chars.WP.i + character.chars.WP.a + character.chars.WP.b;
          const hardyTalent = character.talents.find(t => t.n === 'Hardy');
          const hardyLvl = hardyTalent ? hardyTalent.lvl : 0;
          const speciesWoundData = character.species ? SPECIES_DATA[character.species] : undefined;
          const woundMult = speciesWoundData?.woundMultiplier ?? 1;
          const woundResult = computeWoundMaximum(S, T, WP, hardyLvl, character.woundsUseSB, woundMult);
          return character.eMaxOverride ?? woundResult.total;
        })()}</span>
      </div>
      <div className={styles.compactChars}>
        {CHAR_KEYS.map((key) => {
          const c = character.chars[key];
          const current = c.i + c.a + c.b;
          return (
            <div key={key} className={styles.compactCharCell}>
              <span className={styles.compactCharLabel}>{key}</span>
              <span className={styles.compactCharValue}>{current}</span>
            </div>
          );
        })}
      </div>
      {character.weapons.length > 0 && (
        <div className={styles.compactWeapons}>
          <Swords size={14} aria-hidden="true" />
          <span>
            {character.weapons
              .filter(w => w.equipped !== false)
              .map(w => w.name)
              .filter(Boolean)
              .join(', ') || 'No equipped weapons'}
          </span>
        </div>
      )}
    </div>
  );
}
