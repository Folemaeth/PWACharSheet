import { describe, it, expect } from 'vitest';
import { CLASS_TRAPPINGS } from '../class-trappings';

/**
 * Shape/coverage tests for CLASS_TRAPPINGS (Core p.37 "Class Trappings").
 * Validates: Requirements 11.2
 */
describe('CLASS_TRAPPINGS', () => {
  const EXPECTED_CLASSES = [
    'Academics',
    'Burghers',
    'Courtiers',
    'Peasants',
    'Rangers',
    'Riverfolk',
    'Rogues',
    'Warriors',
  ] as const;

  it('has exactly the 8 Core p.37 class keys', () => {
    expect(Object.keys(CLASS_TRAPPINGS).sort()).toEqual([...EXPECTED_CLASSES].sort());
  });

  it.each(EXPECTED_CLASSES)('%s maps to a non-empty array of non-empty strings', (cls) => {
    const list = CLASS_TRAPPINGS[cls];
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    for (const entry of list) {
      expect(typeof entry).toBe('string');
      expect(entry.trim().length).toBeGreaterThan(0);
    }
  });

  // Verbatim lists from Core p.37 (dice-rolled quantities expressed as rollable entries).
  const EXPECTED_LISTS: Record<(typeof EXPECTED_CLASSES)[number], string[]> = {
    Academics: ['Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Writing Kit', '1d10 Parchment sheets'],
    Burghers: ['Cloak', 'Clothing', 'Dagger', 'Hat', 'Pouch', 'Sling Bag', 'Lunch'],
    Courtiers: ['Dagger', 'Fine Clothing', 'Pouch', 'Tweezers', 'Ear Pick', 'Comb'],
    Peasants: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Rations (1 day)'],
    Rangers: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Backpack', 'Tinderbox', 'Blanket', 'Rations (1 day)'],
    Riverfolk: ['Cloak', 'Clothing', 'Dagger', 'Pouch', 'Sling Bag', 'Flask of Spirits'],
    Rogues: ['Clothing', 'Dagger', 'Pouch', 'Sling Bag', '2 Candles', '1d10 Matches', 'Hood or Mask'],
    Warriors: ['Clothing', 'Hand Weapon', 'Dagger', 'Pouch'],
  };

  it.each(EXPECTED_CLASSES)('%s matches the Core p.37 list verbatim', (cls) => {
    expect(CLASS_TRAPPINGS[cls]).toEqual(EXPECTED_LISTS[cls]);
  });

  it('includes a Dagger in every class list (Core p.37)', () => {
    for (const cls of EXPECTED_CLASSES) {
      expect(CLASS_TRAPPINGS[cls]).toContain('Dagger');
    }
  });
});
