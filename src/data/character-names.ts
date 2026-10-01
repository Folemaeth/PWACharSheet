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
 * Pools are keyed by base-species group. Every `SPECIES_OPTIONS` entry (including the
 * Dwarf/High-Elf stronghold/realm variant keys such as "Dwarfs (Karaz-a-Karak)" or
 * "High Elves (Caledor)") resolves to a pool via `resolveNamePool`, which first tries a
 * dedicated per-key pool, then normalises the key to its base species group, then falls
 * back to FALLBACK_NAME_POOL. See `normaliseSpeciesKey` for the documented normalisation.
 */

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

/**
 * Curated name pools keyed by `SPECIES_OPTIONS` entries. Every base-species group has a
 * dedicated, non-empty pool. Variant keys (Dwarf strongholds, High Elf realms, Wood Elf)
 * intentionally do NOT each get their own pool — they normalise to their base group's pool
 * via `normaliseSpeciesKey` (documented below), which keeps the data compact while still
 * guaranteeing every species key resolves to a non-empty pool (Req 2.2, 2.3).
 *
 * FLAVOUR ONLY — no mechanical effect; not a rulebook table (Req 2.4, 13.2).
 */
export const NAME_POOLS: Record<string, string[]> = {
  // Keyed by the exact SPECIES_DATA key for Humans ("Human / Reiklander").
  'Human / Reiklander': [
    'Albrecht', 'Dieter', 'Friedrich', 'Gunther', 'Heinrich', 'Jakob', 'Karl',
    'Lukas', 'Manfred', 'Otto', 'Reinhard', 'Siegfried', 'Wilhelm', 'Wolfram',
    'Adela', 'Bertha', 'Elsbeth', 'Gisela', 'Helga', 'Ingrid', 'Katrin',
    'Liesel', 'Margarethe', 'Rosa', 'Sieglinde', 'Ulrike',
  ],
  'Dwarf': [
    'Bardin', 'Borri', 'Durgin', 'Grimbald', 'Grombrindal', 'Gunnar', 'Hargin',
    'Kazador', 'Kragg', 'Logaz', 'Norgrim', 'Snorri', 'Thorek', 'Ungrim',
    'Brana', 'Elda', 'Freya', 'Gilda', 'Helgi', 'Kari', 'Runa', 'Thora',
  ],
  'Halfling': [
    'Alberic', 'Bungo', 'Dago', 'Fredegar', 'Hob', 'Lanfel', 'Milo', 'Odo',
    'Perrin', 'Rollo', 'Sam', 'Wilibald',
    'Daisy', 'Hilda', 'Lily', 'Marigold', 'Pansy', 'Poppy', 'Rosa', 'Tilda',
  ],
  'High Elf': [
    'Aenarion', 'Caradryel', 'Eltharion', 'Finubar', 'Imrik', 'Korhil',
    'Mentheus', 'Teclis', 'Tyrion', 'Yrtle',
    'Alarielle', 'Caelith', 'Eldyra', 'Finreir', 'Lileath', 'Narielle',
    'Seledrine', 'Yvraine',
  ],
  'Wood Elf': [
    'Araloth', 'Daith', 'Drycha', 'Gruarth', 'Marrisith', 'Naieth', 'Orion',
    'Scarloc', 'Sceolan', 'Taladan',
    'Ariel', 'Hagar', 'Isha', 'Lileath', 'Naiell', 'Sariel', 'Sylris', 'Willow',
  ],
  'Ogre': [
    'Boragor', 'Brugg', 'Golgfag', 'Grut', 'Jhared', 'Krunch', 'Lugg',
    'Skrag', 'Thrak', 'Ulfdar',
    'Bruna', 'Golga', 'Grisel', 'Hruna', 'Krulla', 'Thruda',
  ],
};

/** Used when a species key resolves to no dedicated or normalised pool (Req 2.3). */
export const FALLBACK_NAME_POOL: string[] = [
  'Alder', 'Bram', 'Corin', 'Dalla', 'Edda', 'Fenn', 'Greta', 'Halvar',
  'Ilsa', 'Joric', 'Kessa', 'Loran', 'Mira', 'Nils', 'Ovric', 'Perra',
];

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
 * Resolves a species key to a non-empty curated name pool, in priority order (Req 2.2, 2.3):
 *   1. A dedicated pool keyed by the exact species key.
 *   2. The base-species pool via `normaliseSpeciesKey`.
 *   3. FALLBACK_NAME_POOL.
 * Always returns a non-empty array (the fallback pool is guaranteed non-empty).
 */
export function resolveNamePool(speciesKey: string): string[] {
  const dedicated = NAME_POOLS[speciesKey];
  if (dedicated && dedicated.length > 0) return dedicated;

  const base = normaliseSpeciesKey(speciesKey);
  if (base) {
    const basePool = NAME_POOLS[base];
    if (basePool && basePool.length > 0) return basePool;
  }

  return FALLBACK_NAME_POOL;
}
