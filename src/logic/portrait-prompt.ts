import type { Character } from '../types/character';
import {
  PORTRAIT_RECOMMENDED_WIDTH,
  PORTRAIT_RECOMMENDED_HEIGHT,
  PORTRAIT_MAX_SIZE_LABEL,
} from './portrait';

/** How much of the character to show in the image. */
export type PortraitFraming = 'portrait' | 'fullBody';

/** Options controlling what the generated portrait prompt includes. */
export interface PortraitPromptOptions {
  /** When true, companions and hirelings are described alongside the main character. */
  includeRetinue: boolean;
  /** 'portrait' = head/chest-up bust; 'fullBody' = full-length figure. Default 'portrait'. */
  framing?: PortraitFraming;
}

/** Trim a value to a clean display string, or return undefined when empty. */
function clean(value: string | undefined | null): string | undefined {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Join non-empty parts with a separator, dropping blanks. */
function joinParts(parts: Array<string | undefined>, sep = ', '): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(sep);
}

/**
 * Build the "appearance" sentence from the character's personal details. Only
 * includes fields that are actually set so the prompt never contains empty slots.
 */
function describeAppearance(character: Character): string {
  const sex = clean(character.sex);
  const species = clean(character.species) ?? 'Human';
  const age = clean(character.age);
  const height = clean(character.height);
  const hair = clean(character.hair);
  const eyes = clean(character.eyes);
  const feature = clean(character.distinguishingFeature);

  // Lead descriptor, e.g. "a female Dwarf" / "a Human".
  const lead = joinParts([sex?.toLowerCase(), species], ' ');
  const descriptors: string[] = [];
  if (age) descriptors.push(`around ${age} years old`);
  if (height) descriptors.push(`standing ${height}`);
  if (hair) descriptors.push(`${hair.toLowerCase()} hair`);
  if (eyes) descriptors.push(`${eyes.toLowerCase()} eyes`);

  let sentence = `A portrait of a ${lead}`;
  if (descriptors.length > 0) sentence += `, ${joinParts(descriptors)}`;
  sentence += '.';
  if (feature) sentence += ` Distinguishing feature: ${feature}.`;
  return sentence;
}

/** Describe career/class/status for occupation flavour. */
function describeRole(character: Character): string | undefined {
  const career = clean(character.career) ?? clean(character.careerPath);
  const level = clean(character.careerLevel);
  const cls = clean(character.class);
  const status = clean(character.status);
  const role = career ? joinParts([level, `(${career})`].filter(Boolean), ' ') : cls;
  if (!role && !status) return undefined;
  return joinParts([
    role ? `Occupation: ${role}` : undefined,
    status ? `social standing ${status}` : undefined,
  ]);
}

/** List equipped/worn weapons for the portrait. Falls back to all if none flagged. */
function describeWeapons(character: Character): string[] {
  const weapons = character.weapons ?? [];
  if (weapons.length === 0) return [];
  const equipped = weapons.filter((w) => w.equipped);
  const chosen = equipped.length > 0 ? equipped : weapons;
  return chosen.map((w) =>
    joinParts([clean(w.name), clean(w.qualities) ? `(${clean(w.qualities)})` : undefined], ' '),
  );
}

/** List worn armour for the portrait. Falls back to all if none flagged worn. */
function describeArmour(character: Character): string[] {
  const armour = character.armour ?? [];
  if (armour.length === 0) return [];
  const worn = armour.filter((a) => a.worn !== false);
  const chosen = worn.length > 0 ? worn : armour;
  return chosen.map((a) =>
    joinParts([clean(a.name), clean(a.locations) ? `on ${clean(a.locations)}` : undefined], ' '),
  );
}

/** A short list of notable, visually relevant trappings (worn items first). */
function describeTrappings(character: Character): string[] {
  const trappings = character.trappings ?? [];
  if (trappings.length === 0) return [];
  // Prefer worn items (visible on the body); otherwise take the first several.
  const worn = trappings.filter((t) => t.worn);
  const chosen = worn.length > 0 ? worn : trappings;
  return chosen.slice(0, 8).map((t) => clean(t.name)).filter((n): n is string => !!n);
}

/** Describe the retinue (companions + hirelings) for an optional group portrait. */
function describeRetinue(character: Character): string[] {
  const lines: string[] = [];
  for (const c of character.companions ?? []) {
    const name = clean(c.name) ?? 'an animal companion';
    const species = clean(c.species);
    lines.push(joinParts([name, species ? `(${species})` : undefined], ' '));
  }
  for (const h of character.hirelings ?? []) {
    const name = clean(h.name) ?? 'a hireling';
    const role = clean(h.role);
    lines.push(joinParts([name, role ? `the ${role}` : undefined], ' '));
  }
  return lines;
}

/**
 * Build a copy-pasteable prompt for an AI image generator to produce a Warhammer
 * Fantasy (WFRP4e) character portrait. The prompt embeds the app's portrait size and
 * file-size requirements and is assembled only from fields that are actually set, so
 * it never contains empty placeholders. Pure and deterministic — no RNG, no I/O.
 */
export function buildPortraitPrompt(
  character: Character,
  options: PortraitPromptOptions,
): string {
  const name = clean(character.name);
  const sections: string[] = [];

  // Intro + grimdark art direction.
  sections.push(
    'Create a character portrait in the grim and perilous style of Warhammer Fantasy ' +
      "Roleplay (the Old World). Painterly, detailed, moody lighting, muted earthy palette.",
  );

  // Who the character is.
  const who: string[] = [];
  if (name) who.push(`Name: ${name}.`);
  who.push(describeAppearance(character));
  const role = describeRole(character);
  if (role) who.push(`${role}.`);
  sections.push(who.join(' '));

  // Gear visible in the portrait.
  const weapons = describeWeapons(character);
  const armour = describeArmour(character);
  const trappings = describeTrappings(character);
  const gearLines: string[] = [];
  if (armour.length > 0) gearLines.push(`Armour: ${joinParts(armour)}.`);
  if (weapons.length > 0) gearLines.push(`Weapons: ${joinParts(weapons)}.`);
  if (trappings.length > 0) gearLines.push(`Notable gear: ${joinParts(trappings)}.`);
  if (gearLines.length > 0) {
    sections.push(`Equip the character as follows. ${gearLines.join(' ')}`);
  }

  // Optional retinue.
  if (options.includeRetinue) {
    const retinue = describeRetinue(character);
    if (retinue.length > 0) {
      sections.push(
        'Include the following retinue in the scene, positioned around or behind the ' +
          `main character: ${joinParts(retinue, '; ')}.`,
      );
    }
  }

  // Framing instruction (no background is described — left to the artist/player).
  const framing = options.framing ?? 'portrait';
  const framingText =
    framing === 'fullBody'
      ? 'Show the full figure from head to toe, standing, centred.'
      : 'Frame the subject from roughly the waist or chest up, centred.';

  // Technical requirements (sourced from the app's portrait constants).
  sections.push(
    'Technical requirements: portrait orientation, approximately ' +
      `${PORTRAIT_RECOMMENDED_WIDTH}x${PORTRAIT_RECOMMENDED_HEIGHT} pixels ` +
      `(same aspect ratio is fine), exported as JPEG, PNG, or WebP, no larger than ` +
      `${PORTRAIT_MAX_SIZE_LABEL}. ${framingText} ` +
      'Do not include any text, lettering, words, captions, watermarks, or the prompt ' +
      'itself in the image - the artwork must contain no writing of any kind.',
  );

  return sections.join('\n\n');
}