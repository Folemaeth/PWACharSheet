import type { Character, FieldPath, FieldValue } from '../../../types/character';
import { Card } from '../../shared/Card';
import { SectionHeader } from '../../shared/SectionHeader';
import { EditableField } from '../../shared/EditableField';
import { CollapsibleSection } from '../../shared/CollapsibleSection';
import { CharacterPortrait } from '../../shared/CharacterPortrait';
import { AgeTierSelector } from '../../shared/AgeTierSelector';
import { DwarfAlternateRoll } from '../../shared/DwarfAlternateRoll';
import { HelpPopover } from '../../shared/HelpPopover';
import { getHelpContent } from '../../../logic/help-content';
import { SPECIES_OPTIONS } from '../../../data/species';
import { CAREER_CLASS_LIST } from '../../../data/careers';
import {
  getEyeColourOptions,
  getHairColourOptions,
} from '../../../logic/personal-details';
import { User } from 'lucide-react';
import { usePersonalDetailsGeneration } from './usePersonalDetailsGeneration';
// Import the SAME stylesheet as the CharacterPage shell so class names stay
// byte-identical after extraction (spec: character-page-decomposition, Req 3.3).
import styles from '../CharacterPage.module.css';

interface PersonalDetailsSectionProps {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  /** Portrait props (portrait lives in IndexedDB, owned by the shell's `usePortrait`). */
  portraitURL: string;
  handlePortraitUpload: (file: File) => void;
  handlePortraitRemove: () => void;
  /** Species/Class/Career change handlers (stay lifted in the shell). */
  handleSpeciesChange: (species: string) => void;
  handleClassChange: (cls: string) => void;
  handleCareerChange: (career: string) => void;
  /** Careers filtered by the current class (derived in the shell). */
  filteredCareers: string[];
}

/**
 * Portrait + Personal Details card + Generate (random-details) panel extracted
 * verbatim from CharacterPage (spec: character-page-decomposition, seam b —
 * Req 2.1).
 *
 * Behaviour-preserving: DOM structure, ARIA, and CSS module classes are
 * identical to the pre-refactor inline blocks (Req 3.1, 3.2, 3.3). The section
 * CONSUMES the `usePersonalDetailsGeneration` hook internally so the shell no
 * longer wires the generation trio/handlers (design.md seam b: this unit owns
 * the Generate panel). `Math.random` lives in the hook and is unchanged (Req
 * 8.3). The typed `update`/`updateCharacter` surface, portrait props, and the
 * species/class/career change handlers + `filteredCareers` are injected by the
 * shell (Lifted_State is not re-declared here — Req 5.2, 5.4).
 *
 * The dropdown option lists (`getHairColourOptions`/`getEyeColourOptions`) and
 * the Dwarf alternate-roll + 2nd-eye-colour controls move with the Generate
 * panel; the panel JSX and its conditionals are copied VERBATIM (Req 3.4).
 */
export function PersonalDetailsSection({
  character,
  update,
  portraitURL,
  handlePortraitUpload,
  handlePortraitRemove,
  handleSpeciesChange,
  handleClassChange,
  handleCareerChange,
  filteredCareers,
}: PersonalDetailsSectionProps) {
  const {
    speciesGroup,
    allDetailsFilled,
    setSelectedAgeTier,
    firstEyeColour,
    showSecondEyeRoll,
    setFirstEyeColour,
    setShowSecondEyeRoll,
    rollAge,
    rollHeight,
    rollHair,
    rollEyes,
    rollSecondEyeColour,
  } = usePersonalDetailsGeneration({ character, update });

  return (
    <>
      {/* Portrait + Personal Details row */}
      <div className={styles.identityRow}>
        <CharacterPortrait
          portrait={portraitURL}
          characterName={character.name}
          onUpload={handlePortraitUpload}
          onRemove={handlePortraitRemove}
        />
        <Card style={{ flex: 1 }}>
          <SectionHeader icon={User} title="Personal Details" />
          <div className={styles.gridAutoFill}>
            <EditableField label="Name" value={character.name} onSave={(v) => update('name', String(v))} />
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Species</span>
              <select
                value={character.species}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                className={styles.select}
              >
                <option value="">— Select Species —</option>
                {SPECIES_OPTIONS.map((sp) => (
                  <option key={sp} value={sp}>{sp}</option>
                ))}
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Class</span>
              <select value={character.class} onChange={(e) => handleClassChange(e.target.value)} className={styles.select}>
                <option value="">— Select Class —</option>
                {CAREER_CLASS_LIST.map((cls) => (<option key={cls} value={cls}>{cls}</option>))}
              </select>
            </div>
            <div className={styles.selectWrapper}>
              <span className={styles.selectLabel}>Career</span>
              <select value={character.career} onChange={(e) => handleCareerChange(e.target.value)} className={styles.select}>
                <option value="">— Select Career —</option>
                {filteredCareers.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <EditableField label="Career Level" value={character.careerLevel} onSave={(v) => update('careerLevel', String(v))} />
            <EditableField label="Career Path" value={character.careerPath} onSave={(v) => update('careerPath', String(v))} />
            <div className={styles.fieldWithHelp}>
              <EditableField label="Status" value={character.status} onSave={(v) => update('status', String(v))} />
              <HelpPopover concept="status-tier">{getHelpContent('status-tier')}</HelpPopover>
            </div>
            <EditableField label="Age" value={character.age} onSave={(v) => update('age', String(v))} />
            <EditableField label="Height" value={character.height} onSave={(v) => update('height', String(v))} />
            <EditableField label="Hair" value={character.hair} onSave={(v) => update('hair', String(v))} />
            <EditableField label="Eyes" value={character.eyes} onSave={(v) => update('eyes', String(v))} />
            {/* Distinguishing Feature — optional flavour text (dwarfguide.md p.40 "Physical Attributes"); no mechanical effect. */}
            <EditableField label="Distinguishing Feature" value={character.distinguishingFeature ?? ''} onSave={(v) => update('distinguishingFeature', String(v))} />
          </div>
        </Card>
      </div>

      {/* Generate Personal Details — collapsible panel with roll/dropdown controls */}
      {!allDetailsFilled && (
        <CollapsibleSection title="🎲 Generate Personal Details" storageKey="collapsible-generate-details" defaultExpanded={true}>
          <Card>
            <div className={styles.generateDetailsGrid}>
              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Age</span>
                {speciesGroup === 'High_Elf' && (
                  <AgeTierSelector onTierChange={(tier) => setSelectedAgeTier(tier)} />
                )}
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={rollAge}
                  disabled={!character.species}
                  aria-label="Roll Age"
                >
                  🎲 Roll
                </button>
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Height</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={rollHeight}
                  disabled={!character.species}
                  aria-label="Roll Height"
                >
                  🎲 Roll
                </button>
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Hair</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={rollHair}
                  disabled={!character.species}
                  aria-label="Roll Hair"
                >
                  🎲 Roll
                </button>
                {speciesGroup && (
                  <select
                    className={styles.generateSelect}
                    onChange={(e) => { update('hair', e.target.value); e.target.value = ''; }}
                    defaultValue=""
                    disabled={!character.species}
                    aria-label="Select Hair"
                  >
                    <option value="" disabled>Select…</option>
                    {getHairColourOptions(speciesGroup).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className={styles.generateRow}>
                <span className={styles.generateLabel}>Eyes</span>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={rollEyes}
                  disabled={!character.species}
                  aria-label="Roll Eyes"
                >
                  🎲 Roll
                </button>
                {speciesGroup && (
                  <select
                    className={styles.generateSelect}
                    onChange={(e) => { update('eyes', e.target.value); e.target.value = ''; setFirstEyeColour(null); setShowSecondEyeRoll(false); }}
                    defaultValue=""
                    disabled={!character.species}
                    aria-label="Select Eyes"
                  >
                    <option value="" disabled>Select…</option>
                    {getEyeColourOptions(speciesGroup).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}
                {showSecondEyeRoll && firstEyeColour && (speciesGroup === 'High_Elf' || speciesGroup === 'Wood_Elf') && (
                  <button
                    type="button"
                    className={styles.generateBtn}
                    onClick={rollSecondEyeColour}
                    aria-label="Roll Second Colour"
                  >
                    🎲 2nd Colour
                  </button>
                )}
              </div>

              {speciesGroup === 'Dwarf' && (
                <div className={styles.generateRow}>
                  <DwarfAlternateRoll
                    variant={character.species.replace(/^dwarfs?\s*/i, '').replace(/^\(|\)$/g, '')}
                    onHairUpdate={(hair) => update('hair', hair)}
                    onEyesUpdate={(eyes) => update('eyes', eyes)}
                    onFeatureUpdate={(feature) => update('distinguishingFeature', feature)}
                    disabled={!character.species}
                  />
                </div>
              )}
            </div>
          </Card>
        </CollapsibleSection>
      )}
    </>
  );
}
