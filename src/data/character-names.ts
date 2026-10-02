/**
 * Curated character name pools for the Random Character Generator.
 *
 * SOURCE NOTE (Req 2.4, 13.2): These names are curated, lore-appropriate FLAVOUR with
 * **no mechanical effect** on any WFRP4e game rule. They are **NOT** a rulebook table and
 * are not drawn from any official random-name table. They exist only so a generated
 * character starts with a species-appropriate name instead of an empty one. The WFRP4e
 * Core Rulebook offers naming *guidance* (Core p.37-39) but no mechanical name table; the
 * entries below are a non-rulebook, curated extension chosen for lore flavour only.
 *
 * Pools are keyed by base-species group and split by sex (male/female) so a generated
 * character's name matches its rolled sex (no males with female names or vice versa).
 * Every `SPECIES_OPTIONS` entry (including the Dwarf/High-Elf stronghold/realm variant
 * keys such as "Dwarfs (Karaz-a-Karak)" or "High Elves (Caledor)") resolves to a pool via
 * `resolveNamePool`, which first tries a dedicated per-key pool, then normalises the key to
 * its base species group, then falls back to FALLBACK_NAME_POOL. See `normaliseSpeciesKey`
 * for the documented normalisation.
 *
 * Sex handling: `resolveNamePool(species)` with no sex (or sex `Other`/blank) returns the
 * combined male+female list; `resolveNamePool(species, 'Male' | 'Female')` returns just the
 * matching sublist. Sex itself has no mechanical effect — it only steers name flavour.
 */

import type { Sex } from '../types/character';

/** Base-species group keys the curated pools are organised under. */
export const BASE_SPECIES_GROUPS = [
  'Human',
  'Dwarf',
  'Halfling',
  'High Elf',
  'Wood Elf',
  'Ogre',
] as const;

export type BaseSpeciesGroup = (typeof BASE_SPECIES_GROUPS)[number];

/** A curated name pool split by sex. Both sublists are non-empty for every species. */
export interface GenderedNamePool {
  male: string[];
  female: string[];
}

/**
 * Curated name pools keyed by `SPECIES_OPTIONS` entries, each split into male/female
 * sublists. Every base-species group has a dedicated pool with non-empty male AND female
 * lists. Variant keys (Dwarf strongholds, High Elf realms, Wood Elf) intentionally do NOT
 * each get their own pool — they normalise to their base group's pool via
 * `normaliseSpeciesKey` (documented below), which keeps the data compact while still
 * guaranteeing every species key resolves to a non-empty pool (Req 2.2, 2.3).
 *
 * FLAVOUR ONLY — no mechanical effect; not a rulebook table (Req 2.4, 13.2).
 */
export const NAME_POOLS: Record<string, GenderedNamePool> = {
  // Keyed by the exact SPECIES_DATA key for Humans ("Human / Reiklander").
  'Human / Reiklander': {
    male: [
      'Adalbert', 'Albrecht', 'Alaric', 'Anselm', 'Arnd', 'Baldric', 'Bernhardt',
      'Burkhart', 'Dietrich', 'Dieter', 'Eberhard', 'Emmerich', 'Engelbert',
      'Ernst', 'Falk', 'Franz', 'Friedrich', 'Gerhardt', 'Gottfried', 'Gunther',
      'Hartmann', 'Heinrich', 'Helmut', 'Hubert', 'Jakob', 'Johann', 'Karl',
      'Konrad', 'Kurt', 'Leopold', 'Lothar', 'Ludwig', 'Lukas', 'Manfred',
      'Markus', 'Matthias', 'Nikolaus', 'Otto', 'Rainer', 'Reinhard', 'Rudiger',
      'Rupert', 'Siegfried', 'Stefan', 'Theodric', 'Udo', 'Ulrich', 'Volker',
      'Werner', 'Wilhelm', 'Wolfram', 'Wulfgar',
    ],
    female: [
      'Adela', 'Agnetha', 'Amalia', 'Anja', 'Annika', 'Bertha', 'Brunhild',
      'Clara', 'Dagmar', 'Edeltraud', 'Elsbeth', 'Elke', 'Emma', 'Erika',
      'Frieda', 'Gerda', 'Gisela', 'Greta', 'Hedwig', 'Helga', 'Hilde',
      'Ilse', 'Ingrid', 'Johanna', 'Karin', 'Katrin', 'Klara', 'Kriemhild',
      'Lena', 'Liesel', 'Lotte', 'Magda', 'Margarethe', 'Marlene', 'Mathilde',
      'Minna', 'Ottilie', 'Petra', 'Renata', 'Rosa', 'Sabina', 'Sieglinde',
      'Sofia', 'Trudi', 'Ulrike', 'Ursula', 'Valda', 'Wilhelmina',
    ],
  },
  'Dwarf': {
    male: [
      'Alrik', 'Bardin', 'Borri', 'Brok', 'Burlok', 'Dammaz', 'Drong', 'Durgin',
      'Dworin', 'Fariik', 'Gotri', 'Grimbald', 'Grimm', 'Grombrindal', 'Grundi',
      'Gunnar', 'Hargin', 'Haki', 'Josef', 'Kazador', 'Kragg', 'Kromm',
      'Logaz', 'Morgrim', 'Norgrim', 'Okri', 'Ragni', 'Skalf', 'Snorri',
      'Thaggi', 'Thorek', 'Thorgrim', 'Thrund', 'Ungrim', 'Varr', 'Wargrim',
      'Yorri', 'Zhufgrim',
    ],
    female: [
      'Astrid', 'Brana', 'Brynja', 'Dagna', 'Edda', 'Elda', 'Freya', 'Frida',
      'Gilda', 'Gudrun', 'Helga', 'Helgi', 'Hilda', 'Ingra', 'Kari', 'Katla',
      'Logna', 'Runa', 'Saga', 'Signy', 'Sigrun', 'Thora', 'Thyra', 'Valka',
      'Yrsa',
    ],
  },
  'Halfling': {
    male: [
      'Alberic', 'Bardo', 'Bilbert', 'Bungo', 'Caddoc', 'Dago', 'Drogo',
      'Fosco', 'Fredegar', 'Griffo', 'Hamfast', 'Hob', 'Jago', 'Lanfel',
      'Largo', 'Milo', 'Mungo', 'Odo', 'Perrin', 'Ponto', 'Rollo', 'Rorik',
      'Sam', 'Sancho', 'Teddo', 'Theo', 'Wilibald', 'Wimble',
    ],
    female: [
      'Amaranth', 'Bell', 'Daisy', 'Esme', 'Hilda', 'Jessamine', 'Lavender',
      'Lily', 'Mabel', 'Marigold', 'May', 'Melilot', 'Myrtle', 'Pansy',
      'Peony', 'Poppy', 'Primrose', 'Rose', 'Rowan', 'Tansy', 'Tilda',
      'Verbena', 'Violet',
    ],
  },
  'High Elf': {
    male: [
      'Aenarion', 'Aislinn', 'Belannaer', 'Caradryel', 'Caelas', 'Cirienn',
      'Eldril', 'Eltharion', 'Farunnel', 'Finubar', 'Gaelith', 'Imrik',
      'Ithilmar', 'Korhil', 'Laurelorn', 'Mentheus', 'Mirelian', 'Naethyr',
      'Salendor', 'Taliel', 'Teclis', 'Thalanar', 'Thranduil', 'Tyrion',
      'Valandril', 'Yrtle',
    ],
    female: [
      'Alarielle', 'Aedionne', 'Aerin', 'Arahir', 'Caelith', 'Celoene',
      'Eldyra', 'Eluven', 'Faelrin', 'Finreir', 'Ielena', 'Isariel', 'Lileath',
      'Maerwen', 'Narielle', 'Nelriel', 'Seledrine', 'Serlaith', 'Thalia',
      'Yrianne', 'Yvraine',
    ],
  },
  'Wood Elf': {
    male: [
      'Araloth', 'Beithir', 'Cadaith', 'Daith', 'Drycha', 'Elynttar', 'Faron',
      'Gruarth', 'Harulf', 'Lacirel', 'Marrisith', 'Naieth', 'Oakheart',
      'Orion', 'Pelantar', 'Scarloc', 'Sceolan', 'Taladan', 'Thalorin',
      'Varnuth', 'Wythel',
    ],
    female: [
      'Ariel', 'Aravae', 'Briseis', 'Cyreth', 'Hagar', 'Ilthyra', 'Isha',
      'Lacireth', 'Lileath', 'Mirelle', 'Naiell', 'Niraelle', 'Saoirse',
      'Sariel', 'Sylris', 'Taelwyn', 'Vaelith', 'Willow', 'Ysolde',
    ],
  },
  'Ogre': {
    male: [
      'Bagrod', 'Boragor', 'Brugg', 'Crushgut', 'Golgfag', 'Grut', 'Hrothgut',
      'Jhared', 'Krunch', 'Lugg', 'Maws', 'Rorg', 'Skrag', 'Thrak', 'Throtgor',
      'Ulfdar', 'Urgluk', 'Vargut',
    ],
    female: [
      'Bruna', 'Golga', 'Grisel', 'Grotta', 'Hruna', 'Krulla', 'Mogga',
      'Rukka', 'Thruda', 'Voska',
    ],
  },
};

/** Used when a species key resolves to no dedicated or normalised pool (Req 2.3). */
export const FALLBACK_NAME_POOL: GenderedNamePool = {
  male: [
    'Alder', 'Berin', 'Bram', 'Corin', 'Dervan', 'Fenn', 'Garrik', 'Halvar',
    'Joric', 'Kaleb', 'Loran', 'Malvin', 'Nils', 'Ovric', 'Rhun', 'Sten',
    'Torvin', 'Yorn',
  ],
  female: [
    'Alys', 'Bryn', 'Dalla', 'Edda', 'Greta', 'Ilsa', 'Jenna', 'Kessa',
    'Mira', 'Nessa', 'Perra', 'Rhian', 'Senna', 'Vesna',
  ],
};

/**
 * Normalises a `SPECIES_OPTIONS` key to its base-species group so stronghold/realm/sub-type
 * variant keys share their base species' name pool. Documented mapping (Req 2.3):
 *
 * - "Human / Reiklander"            -> "Human"
 * - "Dwarf" / "Dwarfs (...)"        -> "Dwarf"      (all Dwarf stronghold & Norse/Imperial variants)
 * - "Halfling"                      -> "Halfling"
 * - "High Elf" / "High Elves (...)" -> "High Elf"   (all High Elf realm & Sea Elf variants)
 * - "Wood Elf"                      -> "Wood Elf"
 * - "Ogre"                          -> "Ogre"
 *
 * Any key not matching these documented patterns returns undefined, and the caller falls
 * back to FALLBACK_NAME_POOL.
 */
export function normaliseSpeciesKey(speciesKey: string): BaseSpeciesGroup | undefined {
  const key = speciesKey.trim();
  if (key.startsWith('Human')) return 'Human';
  // Catches both the base "Dwarf" key and every "Dwarfs (...)" variant.
  if (key === 'Dwarf' || key.startsWith('Dwarfs')) return 'Dwarf';
  if (key === 'Halfling') return 'Halfling';
  // Order matters: check Wood Elf before the High Elf prefix so it is not shadowed.
  if (key === 'Wood Elf') return 'Wood Elf';
  // Catches both the base "High Elf" key and every "High Elves (...)" variant.
  if (key === 'High Elf' || key.startsWith('High Elves')) return 'High Elf';
  if (key === 'Ogre') return 'Ogre';
  return undefined;
}

/**
 * Resolves a species key to its curated GenderedNamePool, in priority order (Req 2.2, 2.3):
 *   1. A dedicated pool keyed by the exact species key.
 *   2. The base-species pool via `normaliseSpeciesKey`.
 *   3. FALLBACK_NAME_POOL.
 * Always returns a pool with non-empty male AND female sublists.
 */
export function resolveGenderedNamePool(speciesKey: string): GenderedNamePool {
  const dedicated = NAME_POOLS[speciesKey];
  if (dedicated) return dedicated;

  const base = normaliseSpeciesKey(speciesKey);
  if (base) {
    const basePool = NAME_POOLS[base];
    if (basePool) return basePool;
  }

  return FALLBACK_NAME_POOL;
}

/**
 * Resolves a species key (and optional sex) to a non-empty flat list of candidate names
 * (Req 2.1, 2.2, 2.3):
 *   - sex 'Male'   -> the male sublist.
 *   - sex 'Female' -> the female sublist.
 *   - sex 'Other', '' or undefined -> the combined male + female list.
 * Always returns a non-empty array. The combined list is what membership checks use, so a
 * sex-matched name is always also a member of `resolveNamePool(species)`.
 */
export function resolveNamePool(speciesKey: string, sex?: Sex): string[] {
  const pool = resolveGenderedNamePool(speciesKey);
  if (sex === 'Male') return pool.male;
  if (sex === 'Female') return pool.female;
  return [...pool.male, ...pool.female];
}