import type { SpeciesGroup } from './personal-details';

/**
 * Curated distinguishing-feature pools for the Random Character Generator.
 *
 * SOURCE NOTE (Req 16.7): The features below are curated, lore-appropriate FLAVOUR with
 * **no mechanical effect** on any WFRP4e game rule. They are **NOT** a rulebook table and
 * are not drawn from any official random table. They exist only so a generated non-Dwarf
 * character starts with a species-appropriate distinguishing feature instead of an empty
 * one, mirroring the curated Name_Pool treatment in `character-names.ts`.
 *
 * Dwarf distinguishing features are the ONE exception: they ARE rulebook-sourced, coming
 * from the official d100 alternate table (dwarfguide.md p.40) via `lookupDwarfAlternateTable`.
 * That is why this file intentionally has **no Dwarf pool** — Dwarf features must never be
 * drawn from these curated flavour lists.
 *
 * Pools are keyed by the non-Dwarf `SpeciesGroup` names (underscore form: `High_Elf`,
 * `Wood_Elf`). `resolveFeaturePool` returns the dedicated pool when present and non-empty,
 * otherwise `FALLBACK_FEATURE_POOL`, so every lookup yields a non-empty array (Req 16.6).
 */

/**
 * Curated feature pools keyed by non-Dwarf `SpeciesGroup`. Every non-Dwarf group has a
 * dedicated, non-empty pool (Req 16.6). No `Dwarf` key — see the source note above.
 *
 * FLAVOUR ONLY — no mechanical effect; not a rulebook table (Req 16.7).
 */
export const FEATURE_POOLS: Record<string, string[]> = {
  Human: [
    'A jagged scar across one cheek',
    'A missing earlobe',
    'A gap-toothed smile',
    'A crooked, once-broken nose',
    'A faded tattoo on the forearm',
    'A birthmark shaped like a crescent',
    'A permanent five-o-clock shadow',
    'A notably deep, gravelly voice',
    'Freckles across the nose and cheeks',
    'A nervous habit of cracking knuckles',
    'One eyebrow split by an old cut',
    'A weathered, sun-browned complexion',
  ],
  Halfling: [
    'Remarkably hairy, well-groomed feet',
    'Rosy, perpetually flushed cheeks',
    'A dimpled chin',
    'A gap between the front teeth',
    'A smattering of flour-dust freckles',
    'An ever-present, contented smile',
    'A single curl that will not lie flat',
    'Plump, laugh-lined features',
    'A faint scent of pipeweed',
    'A chip in one front tooth',
  ],
  High_Elf: [
    'A faint, cold luminescence to the skin',
    'Hair that seems to catch unseen light',
    'An unnervingly steady, unblinking gaze',
    'A single lock of silver among the hair',
    'Flawless, almost porcelain features',
    'An intricate circlet-mark tanline on the brow',
    'Impossibly long, tapered fingers',
    'A voice with a faint musical lilt',
    'Faint iridescent patterning near the eyes',
    'An aloof, ageless expression',
  ],
  Wood_Elf: [
    'Skin dappled as if by leaf-shadow',
    'Hair woven through with twigs and leaves',
    'Eyes that reflect faintly in the dark',
    'A spiralling vine tattoo along one arm',
    'Bark-rough calluses on the hands',
    'A faint scent of moss and pine',
    'Thin ritual scars tracing the cheekbones',
    'An utterly silent, prowling gait',
    'Feathers braided into the hair',
    'A wary, feral alertness to the eyes',
  ],
  Ogre: [
    'A mouthful of broken, jutting tusks',
    'A gut-plate hammered from scrap metal',
    'A trophy-string of enemy teeth',
    'A nose flattened across the face',
    'Fists scarred from a lifetime of brawling',
    'A booming, cavernous belch of a laugh',
    'Half an ear chewed away in some fight',
    'Crude tribal tattoos across the belly',
    'A perpetually hungry, roving stare',
    'Knuckles the size of a human fist',
  ],
};

/** Used when a species group has no dedicated pool, guaranteeing a non-empty result (Req 16.6). */
export const FALLBACK_FEATURE_POOL: string[] = [
  'A noticeable scar of uncertain origin',
  'An unusual, memorable gait',
  'A distinctive, often-noticed laugh',
  'A weathered, well-travelled look',
  'A single discoloured patch of skin',
  'An old injury that aches in the cold',
  'A habit of chewing the lower lip',
  'A notably firm, calloused handshake',
];

/**
 * Resolves a species group to a non-empty curated feature pool (Req 16.6):
 *   1. The dedicated pool keyed by the group, when present and non-empty.
 *   2. `FALLBACK_FEATURE_POOL`.
 * Always returns a non-empty array (the fallback pool is guaranteed non-empty).
 *
 * NOTE: Passing `'Dwarf'` returns the fallback pool, not a Dwarf pool — Dwarf features are
 * rulebook-sourced from the d100 table and must not be drawn from this file (see source note).
 */
export function resolveFeaturePool(group: SpeciesGroup | string): string[] {
  const dedicated = FEATURE_POOLS[group];
  if (dedicated && dedicated.length > 0) return dedicated;
  return FALLBACK_FEATURE_POOL;
}
