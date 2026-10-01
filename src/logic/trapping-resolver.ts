/**
 * Trapping Resolver — maps a granted starting-trapping string to concrete items.
 *
 * Starting gear comes from two Core sources (rules-compliance steering rule):
 *  - Career Trappings: the level-1 trappings listed for a career (Core p.36
 *    "Career Trappings").
 *  - Class Trappings: the general starting equipment granted by Class (Core p.37
 *    "Class Trappings"), see `src/data/class-trappings.ts`.
 *
 * Granted trapping strings are free-text (e.g. "Hand Weapon", "Melee Weapon
 * (Basic or Cavalry)", "Longbow and 10 arrows"). This helper resolves each string
 * into zero or more concrete, routable items: a full weapon stat block (from
 * WEAPONS), a full armour stat block (from ARMOURS), or a named trapping.
 *
 * Resolution order (Req 11.3–11.7):
 *   1. Whole-string COMPOUND_MAP lookup for known multi-item categories (handles
 *      special compound entries such as "Longbow and 10 arrows" before the generic
 *      " and " split can break them apart).
 *   2. Whole-string AMBIGUOUS_MAP lookup for known generic categories, before the
 *      or/and split — some map keys contain " or " inside parentheses (e.g. "Melee
 *      Weapon (Basic or Cavalry)") and must resolve as a unit (Req 11.4).
 *   3. " and " → resolve every part and return all of them (Req 11.3).
 *   4. " or "  → pick exactly one part via the RNG, then resolve it (Req 11.3/11.4).
 *   5. Per-part AMBIGUOUS_MAP lookup for generic categories (Req 11.4).
 *   6. Exact WEAPONS match → full weapon stat block (Req 11.5).
 *   7. Exact ARMOURS match → full armour stat block (Req 11.6).
 *   8. Fallback → named trapping `{ name, enc: '0', quantity }` (Req 11.7); a
 *      leading quantity phrase ("10 arrows") sets a sensible quantity, else 1.
 */

import type { WeaponItem, ArmourItem, Trapping, WeaponData, ArmourData } from '../types/character';
import { WEAPONS } from '../data/weapons';
import { ARMOURS } from '../data/armour';
import { pick, type RNG } from './random-character-generator';

/** A resolved trapping, discriminated so the caller routes it to the right list. */
export type ResolvedTrapping =
  | { kind: 'weapon'; item: WeaponItem }
  | { kind: 'armour'; item: ArmourItem }
  | { kind: 'trapping'; item: Trapping };

/**
 * Maps ambiguous / generic granted-trapping strings to a concrete item name that is
 * resolvable in WEAPONS / ARMOURS, or to a named trapping.
 *
 * ⚠ = documented judgment call (Req 13.3): the Core trapping text names a generic
 * category or an item with no exact entry in WEAPONS/ARMOURS, so we map it to the
 * closest concrete item that exists in the app data. These are interpretations, not
 * invented mechanics — the underlying grant (Core p.36–37) is unchanged.
 *
 * Unlisted entries fall through to exact-name lookup, then to a named trapping
 * (Req 11.7).
 */
export const AMBIGUOUS_MAP: Record<string, string> = {
  // Exact concrete weapons — pass through to the WEAPONS stat block (Core p.36).
  'Hand Weapon': 'Hand Weapon',
  Dagger: 'Dagger',
  // ⚠ Judgment call (Req 13.3): "Melee Weapon (Basic or Cavalry)" is a generic
  // category; resolve to the baseline Basic weapon (Hand Weapon). Core p.36.
  'Melee Weapon (Basic or Cavalry)': 'Hand Weapon',
  // Exact concrete armour — pass through to the ARMOURS stat block (Core p.37).
  'Leather Jack': 'Leather Jack',
  // ⚠ Judgment call (Req 13.3): "Boiled Leather Breastplate" has no exact ARMOURS
  // entry; resolve to the closest Boiled-Leather body armour (Leather Jerkin, body,
  // 1 AP, BoiledLeather). Core p.37.
  'Boiled Leather Breastplate': 'Leather Jerkin',
  // "Trade Tools" is not a weapon or armour; keep it as a named trapping (the map
  // simply normalises the name — fallthrough stores it via the fallback branch).
  'Trade Tools': 'Trade Tools',
  'Trade Tools (as Trade)': 'Trade Tools',
};

/**
 * Compound AMBIGUOUS entries that resolve to MULTIPLE concrete items. Checked as a
 * whole string before the generic " and " split, because splitting on " and " would
 * otherwise mangle the quantity phrase ("Longbow and 10 arrows").
 *
 * ⚠ = documented judgment call (Req 13.3): the exact named item has no WEAPONS entry,
 * so we resolve to the nearest ranged weapon plus a named ammunition trapping. The
 * grant itself (a bow + ammunition, a sling + ammunition) is faithful to Core p.36.
 */
const COMPOUND_MAP: Record<string, ResolvedTrapping[]> = {
  // ⚠ "Longbow and 10 arrows": no "Longbow" entry resolves cleanly to the generic
  // ranged profile here; map to Bow (nearest Core Bow stat block) + 10 arrows.
  'Longbow and 10 arrows': [
    { kind: 'weapon', item: toWeaponItem(findWeapon('Bow')) },
    { kind: 'trapping', item: { name: 'Arrows', enc: '0', quantity: 10 } },
  ],
  // ⚠ "Sling with 10 stones": map to Sling (exact Core stat block) + 10 stones.
  'Sling with 10 stones': [
    { kind: 'weapon', item: toWeaponItem(findWeapon('Sling')) },
    { kind: 'trapping', item: { name: 'Sling Stones', enc: '0', quantity: 10 } },
  ],
};

/** Find an exact WEAPONS entry by name (undefined if none). */
function findWeapon(name: string): WeaponData | undefined {
  return WEAPONS.find((w) => w.name === name);
}

/** Find an exact ARMOURS entry by name (undefined if none). */
function findArmour(name: string): ArmourData | undefined {
  return ARMOURS.find((a) => a.name === name);
}

/** Copy a WEAPONS stat block into a character WeaponItem with the full stat block (Req 11.5). */
function toWeaponItem(data: WeaponData | undefined): WeaponItem {
  // Caller guarantees `data` exists for COMPOUND_MAP entries; guard defensively.
  if (!data) {
    throw new Error('toWeaponItem(): missing WEAPONS entry for a mapped compound trapping');
  }
  return { ...data };
}

/** Copy an ARMOURS stat block into a character ArmourItem with the full stat block (Req 11.6). */
function toArmourItem(data: ArmourData): ArmourItem {
  return { ...data };
}

/**
 * Parse a leading quantity phrase from a trapping name, e.g. "10 arrows" → { quantity: 10,
 * name: 'arrows' } and "2 Candles" → { quantity: 2, name: 'Candles' }. Entries without a
 * leading count keep quantity 1 (Req 11.7).
 */
function parseQuantity(entry: string): { name: string; quantity: number } {
  const match = /^(\d+)\s+(.+)$/.exec(entry.trim());
  if (match) {
    const quantity = parseInt(match[1], 10);
    return { name: match[2].trim(), quantity: quantity > 0 ? quantity : 1 };
  }
  return { name: entry.trim(), quantity: 1 };
}

/** Resolve a single already-split part (no " and " / " or " left) to one ResolvedTrapping. */
function resolvePart(part: string): ResolvedTrapping {
  const trimmed = part.trim();

  // Normalise known generic categories to a concrete item name (Req 11.4). Use an
  // own-property guard so inherited Object.prototype keys (e.g. "__proto__") can
  // never resolve to a non-string prototype value.
  const mapped = Object.prototype.hasOwnProperty.call(AMBIGUOUS_MAP, trimmed)
    ? AMBIGUOUS_MAP[trimmed]
    : trimmed;

  // Exact weapon match → full stat block (Req 11.5).
  const weapon = findWeapon(mapped);
  if (weapon) {
    return { kind: 'weapon', item: toWeaponItem(weapon) };
  }

  // Exact armour match → full stat block (Req 11.6).
  const armour = findArmour(mapped);
  if (armour) {
    return { kind: 'armour', item: toArmourItem(armour) };
  }

  // Fallback → named trapping, parsing any leading quantity phrase (Req 11.7).
  const { name, quantity } = parseQuantity(mapped);
  return { kind: 'trapping', item: { name, enc: '0', quantity } };
}

/**
 * Resolve a single granted trapping string into zero or more concrete items.
 *
 * @param entry A granted trapping string from a Career (Core p.36) or Class (Core p.37) list.
 * @param rng   The injectable RNG seam — used to pick a single option for " or " entries.
 */
export function resolveTrapping(entry: string, rng: RNG): ResolvedTrapping[] {
  const trimmed = entry.trim();

  // 1. Whole-string compound lookup (special multi-item categories), checked before
  //    the generic " and " split so quantity phrases survive (Req 11.3/11.4).
  //    Use an own-property guard so inherited Object.prototype keys (e.g. the string
  //    "__proto__") can never match and return a non-array value.
  const compound = Object.prototype.hasOwnProperty.call(COMPOUND_MAP, trimmed)
    ? COMPOUND_MAP[trimmed]
    : undefined;
  if (compound) {
    // Return fresh copies so callers can mutate results without cross-contamination.
    return compound.map((r) =>
      r.kind === 'trapping'
        ? { kind: 'trapping', item: { ...r.item } }
        : r.kind === 'weapon'
          ? { kind: 'weapon', item: { ...r.item } }
          : { kind: 'armour', item: { ...r.item } },
    );
  }

  // 2. Whole-string AMBIGUOUS_MAP lookup for a known generic category, BEFORE the
  //    or/and split. Some mapped categories contain " or " inside parentheses
  //    (e.g. "Melee Weapon (Basic or Cavalry)") and must resolve as a unit rather
  //    than being split on that inner " or " (Req 11.4).
  if (Object.prototype.hasOwnProperty.call(AMBIGUOUS_MAP, trimmed)) {
    return [resolvePart(trimmed)];
  }

  // 3. " and " → resolve every part and return all (Req 11.3).
  if (trimmed.includes(' and ')) {
    return trimmed.split(' and ').flatMap((part) => resolveTrapping(part, rng));
  }

  // 4. " or " → pick exactly one option via the RNG, then resolve it (Req 11.3/11.4).
  if (trimmed.includes(' or ')) {
    const options = trimmed.split(' or ').map((o) => o.trim());
    const chosen = pick(rng, options);
    return resolveTrapping(chosen, rng);
  }

  // 5–7. Single part: AMBIGUOUS_MAP → WEAPONS → ARMOURS → named trapping.
  return [resolvePart(trimmed)];
}
