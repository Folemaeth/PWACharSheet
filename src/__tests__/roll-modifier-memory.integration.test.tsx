import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { createCharacter, loadCharacter } from '../storage/character-manager';

/**
 * The roll dialog remembers the Target and SL modifiers a skill was last rolled
 * with. They are kept on the character, so this goes through the whole app:
 * roll once, open the dialog again, and the fields come back filled in.
 */
describe('roll modifier memory — through the app', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  async function openRollDialog(name: string) {
    fireEvent.click(await screen.findByRole('button', { name: `Roll ${name}` }));
    return screen.findByRole('dialog', { name: 'Roll Dialog' });
  }

  it('pre-fills the modifiers last rolled with, separately per characteristic', async () => {
    const id = createCharacter('Tester');
    render(<App />);

    await openRollDialog('Willpower');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Target Modifier'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /^roll$/i }));
    const rollResult = await screen.findByRole('dialog', { name: 'Roll Result' });
    fireEvent.click(within(rollResult).getByRole('button', { name: 'Dismiss' }));

    // Same characteristic: remembered
    await openRollDialog('Willpower');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(10);
    expect(screen.getByLabelText('SL Modifier')).toHaveValue(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Another characteristic: its own, still empty
    await openRollDialog('Toughness');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(null);
    expect(screen.getByLabelText('SL Modifier')).toHaveValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Saved with the character
    window.dispatchEvent(new Event('beforeunload'));
    expect(loadCharacter(id)?.rollModifiers).toEqual({ Willpower: { targetModifier: 10, slModifier: 2 } });
  });
});
