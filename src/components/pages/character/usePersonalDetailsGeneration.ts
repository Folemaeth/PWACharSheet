import { useState, useEffect, useRef } from 'react';
import type { Character, FieldPath, FieldValue } from '../../../types/character';
import type { HighElfAgeTier } from '../../../data/personal-details';
import { AGE_FORMULAS, HEIGHT_FORMULAS } from '../../../data/personal-details';
import {
  getSpeciesGroup,
  generateAge,
  generateHeight,
  humanHeightNeedsBonus,
  lookupEyeColour,
  lookupHairColour,
  formatVariegatedEyes,
} from '../../../logic/personal-details';

interface UsePersonalDetailsGenerationOptions {
  character: Character;
  /** Typed single-field update, unchanged from CharacterPageProps (Req 6.1, 6.2). */
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
}

/**
 * Personal-details random-generation logic extracted from CharacterPage (seam b).
 *
 * Owns the transient generation state (`selectedAgeTier`, `firstEyeColour`,
 * `showSecondEyeRoll`) and the species-change reset effect (keyed on
 * `prevSpeciesRef`) that previously lived in the shell. Returns the derived
 * `speciesGroup`/`allDetailsFilled` plus the age/height/hair/eyes/2nd-eye roll
 * handlers so the shell can wire them into the existing Generate panel JSX.
 *
 * Behaviour-preserving (spec: character-page-decomposition, Req 8.3): every
 * `Math.random` usage below is copied VERBATIM from the pre-refactor inline
 * handlers — no RNG change. The generation tables/formulas themselves live in
 * `logic/personal-details.ts` and are sourced from the WFRP4e rulebooks
 * (Core p.24-25 "Height and Age"; species guides for Dwarf/Elf variants —
 * see `data/personal-details.ts`), and are not altered here (rules-compliance).
 */
export function usePersonalDetailsGeneration({ character, update }: UsePersonalDetailsGenerationOptions) {
  // Personal details: species group + state for random generation
  const speciesGroup = getSpeciesGroup(character.species);
  const allDetailsFilled = !!(character.age && character.height && character.hair && character.eyes);
  const [selectedAgeTier, setSelectedAgeTier] = useState<HighElfAgeTier | undefined>(undefined);
  const [firstEyeColour, setFirstEyeColour] = useState<string | null>(null);
  const [showSecondEyeRoll, setShowSecondEyeRoll] = useState(false);

  // Reset personal detail generation state when species changes (Req 9.6, 9.7, 12.4)
  // Dropdown options update automatically since they're derived from speciesGroup.
  // Free-text values (age, height, hair, eyes) are retained — not cleared here.
  const prevSpeciesRef = useRef(character.species);
  // Intentional setState-in-effect: resets transient roll UI state when the
  // character's species changes (an external prop), guarded by a ref so it
  // only fires on an actual change rather than every render.
  useEffect(() => {
    if (prevSpeciesRef.current !== character.species) {
      prevSpeciesRef.current = character.species;
      setFirstEyeColour(null);
      setShowSecondEyeRoll(false);
      setSelectedAgeTier(undefined);
    }
  }, [character.species]);

  // ── Roll handlers (Math.random copied VERBATIM — no RNG change, Req 8.3) ──

  const rollAge = () => {
    if (!speciesGroup) return;
    const tier = speciesGroup === 'High_Elf' ? selectedAgeTier : undefined;
    const diceCount = tier ? tier.diceCount : AGE_FORMULAS[speciesGroup].diceCount;
    const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 10) + 1);
    const age = generateAge(speciesGroup, dice, tier);
    update('age', String(age));
  };

  const rollHeight = () => {
    if (!speciesGroup) return;
    const diceCount = HEIGHT_FORMULAS[speciesGroup].diceCount;
    const dice = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 10) + 1);
    if (speciesGroup === 'Human') {
      const needsBonus = humanHeightNeedsBonus(dice as [number, number]);
      if (needsBonus) {
        const bonusDie = Math.floor(Math.random() * 10) + 1;
        update('height', generateHeight(speciesGroup, dice, bonusDie));
      } else {
        update('height', generateHeight(speciesGroup, dice));
      }
    } else {
      update('height', generateHeight(speciesGroup, dice));
    }
  };

  const rollHair = () => {
    if (!speciesGroup) return;
    const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
    const roll = dice[0] + dice[1];
    update('hair', lookupHairColour(speciesGroup, roll));
  };

  const rollEyes = () => {
    if (!speciesGroup) return;
    const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
    const roll = dice[0] + dice[1];
    const eyeColour = lookupEyeColour(speciesGroup, roll);
    update('eyes', eyeColour);
    if (speciesGroup === 'High_Elf' || speciesGroup === 'Wood_Elf') {
      setFirstEyeColour(eyeColour);
      setShowSecondEyeRoll(true);
    } else {
      setFirstEyeColour(null);
      setShowSecondEyeRoll(false);
    }
  };

  const rollSecondEyeColour = () => {
    if (!speciesGroup) return;
    if (firstEyeColour === null) return;
    const dice = Array.from({ length: 2 }, () => Math.floor(Math.random() * 10) + 1);
    const roll = dice[0] + dice[1];
    const secondColour = lookupEyeColour(speciesGroup, roll);
    update('eyes', formatVariegatedEyes(firstEyeColour, secondColour));
    setFirstEyeColour(null);
    setShowSecondEyeRoll(false);
  };

  return {
    speciesGroup,
    allDetailsFilled,
    selectedAgeTier,
    setSelectedAgeTier,
    firstEyeColour,
    setFirstEyeColour,
    showSecondEyeRoll,
    setShowSecondEyeRoll,
    rollAge,
    rollHeight,
    rollHair,
    rollEyes,
    rollSecondEyeColour,
  };
}
