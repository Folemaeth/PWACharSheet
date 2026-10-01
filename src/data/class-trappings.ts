/**
 * General starting Trappings by Class (Core p.37 "Class Trappings").
 *
 * Transcribed verbatim from the WFRP 4e Core Rulebook p.37. Every character begins
 * play with the general Trappings determined by their Class (in addition to the
 * Career-level trappings). Dice-rolled quantities (e.g. Academics' "1d10 sheets of
 * Parchment", Rogues' "1d10 Matches") are expressed as literal entries so the
 * Trapping_Resolver / generator can roll them via the RNG seam.
 *
 * Starting Wealth rule (Core p.37): determined by Status Tier and Standing.
 *   Brass  → 2d10 brass pennies (d)  per Status Level (Standing)
 *   Silver → 1d10 silver shillings (ss) per Status Level (Standing)
 *   Gold   → 1 Gold crown (GC)       per Status Level (Standing)
 * i.e. `Brass 2d10 d / Silver 1d10 ss / Gold 1 GC` PER Status Level (Standing).
 * Example (Core p.37): Brass 3 → 6d10 d; Silver 3 → 3d10 ss; Gold 3 → 3 GC.
 */
export const CLASS_TRAPPINGS: Record<string, string[]> = {
  // Core p.37: Clothing, Dagger, Pouch, Sling Bag containing Writing Kit and 1d10 sheets of Parchment
  Academics: ['Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Writing Kit', '1d10 Parchment sheets'],
  // Core p.37: Cloak, Clothing, Dagger, Hat, Pouch, Sling Bag containing Lunch
  Burghers: ['Cloak', 'Clothing', 'Dagger', 'Hat', 'Pouch', 'Sling Bag', 'Lunch'],
  // Core p.37: Dagger, Fine Clothing, Pouch containing Tweezers, Ear Pick, and a Comb
  Courtiers: ['Dagger', 'Fine Clothing', 'Pouch', 'Tweezers', 'Ear Pick', 'Comb'],
  // Core p.37: Cloak, Clothing, Dagger, Pouch, Sling Bag containing Rations (1 day)
  Peasants: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Rations (1 day)'],
  // Core p.37: Cloak, Clothing, Dagger, Pouch, Backpack containing Tinderbox, Blanket, Rations (1 day)
  Rangers: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Backpack', 'Tinderbox', 'Blanket', 'Rations (1 day)'],
  // Core p.37: Cloak, Clothing, Dagger, Pouch, Sling Bag containing a Flask of Spirits
  Riverfolk: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Flask of Spirits'],
  // Core p.37: Clothing, Dagger, Pouch, Sling Bag containing 2 Candles, 1d10 Matches, a Hood or Mask
  Rogues: ['Clothing', 'Dagger', 'Pouch', 'Sling Bag', '2 Candles', '1d10 Matches', 'Hood or Mask'],
  // Core p.37: Clothing, Hand Weapon, Dagger, Pouch
  Warriors: ['Clothing', 'Hand Weapon', 'Dagger', 'Pouch'],
};
