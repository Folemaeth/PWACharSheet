import { describe, it, expect } from 'vitest';
import { buildPortraitPrompt } from '../portrait-prompt';
import {
  PORTRAIT_RECOMMENDED_WIDTH,
  PORTRAIT_RECOMMENDED_HEIGHT,
  PORTRAIT_MAX_SIZE_LABEL,
} from '../portrait';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

describe('buildPortraitPrompt', () => {
  it('includes the portrait size and file-size requirements from the shared constants', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
    });
    expect(prompt).toContain(`${PORTRAIT_RECOMMENDED_WIDTH}x${PORTRAIT_RECOMMENDED_HEIGHT}`);
    expect(prompt).toContain(PORTRAIT_MAX_SIZE_LABEL);
    expect(prompt).toMatch(/JPEG, PNG, or WebP/);
    expect(prompt).toMatch(/Warhammer Fantasy/i);
  });

  it('explicitly instructs the AI not to render any text in the image', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
    });
    expect(prompt).toMatch(/do not include any text/i);
    expect(prompt).toMatch(/no writing of any kind/i);
  });

  it('does not describe a background', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
    });
    expect(prompt).not.toMatch(/background/i);
  });

  it('defaults to a bust (portrait) framing when no framing is given', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
    });
    expect(prompt).toMatch(/waist or chest up/i);
    expect(prompt).not.toMatch(/head to toe/i);
  });

  it('uses a full-length instruction when framing is fullBody', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
      framing: 'fullBody',
    });
    expect(prompt).toMatch(/head to toe/i);
    expect(prompt).not.toMatch(/waist or chest up/i);
  });

  it('uses a bust instruction when framing is portrait', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Human / Reiklander' }), {
      includeRetinue: false,
      framing: 'portrait',
    });
    expect(prompt).toMatch(/waist or chest up/i);
    expect(prompt).not.toMatch(/head to toe/i);
  });

  it('includes the personal details that are set', () => {
    const char = makeCharacter({
      name: 'Gunther',
      species: 'Human / Reiklander',
      sex: 'Male',
      age: '32',
      height: `5'10"`,
      hair: 'Brown',
      eyes: 'Grey',
      distinguishingFeature: 'A jagged scar across one cheek',
      career: 'Soldier',
      careerLevel: 'Recruit',
      status: 'Brass 3',
    });
    const prompt = buildPortraitPrompt(char, { includeRetinue: false });
    expect(prompt).toContain('Gunther');
    expect(prompt).toContain('male');
    expect(prompt).toContain('Human / Reiklander');
    expect(prompt).toContain('32 years old');
    expect(prompt).toContain(`5'10"`);
    expect(prompt).toContain('brown hair');
    expect(prompt).toContain('grey eyes');
    expect(prompt).toContain('A jagged scar across one cheek');
    expect(prompt).toContain('Soldier');
    expect(prompt).toContain('Brass 3');
  });

  it('does not emit empty placeholders for unset fields', () => {
    const prompt = buildPortraitPrompt(makeCharacter({ species: 'Dwarf' }), {
      includeRetinue: false,
    });
    // No stray descriptors when age/height/hair/eyes are blank.
    expect(prompt).not.toContain('years old');
    expect(prompt).not.toContain('standing');
    expect(prompt).not.toContain('hair');
    expect(prompt).not.toContain('eyes');
    expect(prompt).not.toContain('undefined');
    // No double spaces introduced by dropped blank fields.
    expect(prompt).not.toMatch(/ {2,}/);
  });

  it('lists equipped weapons and worn armour', () => {
    const char = makeCharacter({
      species: 'Human / Reiklander',
      weapons: [
        { name: 'Hand Weapon', group: 'Basic', enc: '1', damage: '+SB+4', qualities: '', equipped: true },
        { name: 'Dagger', group: 'Basic', enc: '0', damage: '+SB+2', qualities: '', equipped: false },
      ],
      armour: [
        { name: 'Leather Jack', locations: 'Body, Arms', enc: '1', ap: 1, qualities: '', worn: true },
        { name: 'Spare Helm', locations: 'Head', enc: '1', ap: 2, qualities: '', worn: false },
      ],
    });
    const prompt = buildPortraitPrompt(char, { includeRetinue: false });
    // Equipped weapon shown; non-equipped excluded when at least one is equipped.
    expect(prompt).toContain('Hand Weapon');
    expect(prompt).not.toContain('Dagger');
    // Worn armour shown; non-worn excluded when at least one is worn.
    expect(prompt).toContain('Leather Jack');
    expect(prompt).not.toContain('Spare Helm');
  });

  it('omits the retinue section when includeRetinue is false', () => {
    const char = makeCharacter({
      species: 'Human / Reiklander',
      companions: [
        {
          name: 'Rex', species: 'Dog', M: 6, WS: 25, BS: 0, S: 25, T: 25, I: 30,
          Ag: 35, Dex: 0, Int: 10, WP: 20, Fel: 10, W: 8, wCur: 8, traits: '', trained: [], notes: '',
        },
      ],
      hirelings: [],
    });
    const prompt = buildPortraitPrompt(char, { includeRetinue: false });
    expect(prompt).not.toContain('Rex');
    expect(prompt).not.toMatch(/retinue in the scene/i);
  });

  it('includes companions and hirelings when includeRetinue is true', () => {
    const char = makeCharacter({
      species: 'Human / Reiklander',
      companions: [
        {
          name: 'Rex', species: 'Dog', M: 6, WS: 25, BS: 0, S: 25, T: 25, I: 30,
          Ag: 35, Dex: 0, Int: 10, WP: 20, Fel: 10, W: 8, wCur: 8, traits: '', trained: [], notes: '',
        },
      ],
      hirelings: [
        {
          id: 1, name: 'Bruno', role: 'Mercenary', status: 'Silver 1', M: 4, WS: 40, BS: 30,
          S: 35, T: 35, I: 30, Ag: 30, Dex: 25, Int: 25, WP: 30, Fel: 25, W: 12, wCur: 12,
          skills: '', talents: '', traits: '', trappings: '', template: '', physicalQuirk: '',
          workEthic: '', personalityQuirk: '', upkeep: { gc: 0, ss: 0, d: 0 }, conditions: [], notes: '',
        },
      ],
    });
    const prompt = buildPortraitPrompt(char, { includeRetinue: true });
    expect(prompt).toMatch(/retinue in the scene/i);
    expect(prompt).toContain('Rex');
    expect(prompt).toContain('Dog');
    expect(prompt).toContain('Bruno');
    expect(prompt).toContain('Mercenary');
  });

  it('is deterministic for identical input', () => {
    const char = makeCharacter({ name: 'Ava', species: 'High Elf', sex: 'Female' });
    const a = buildPortraitPrompt(char, { includeRetinue: false });
    const b = buildPortraitPrompt(char, { includeRetinue: false });
    expect(a).toBe(b);
  });
});