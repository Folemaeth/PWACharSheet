import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { createCharacter, loadCharacter } from '../storage/character-manager';

/**
 * What the roll dialog writes to the character, driven through the whole app:
 * the Target and SL modifiers a skill was last rolled with (so the dialog opens
 * with them filled in), and the rolls of an Extended Test.
 */
describe('roll dialog — through the app', () => {
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

  it('an Extended Test logs each roll to the character while the dialog stays open', async () => {
    const id = createCharacter('Tester');
    render(<App />);

    const dialog = await openRollDialog('Willpower');
    fireEvent.click(screen.getByLabelText('Extended Test'));
    fireEvent.click(screen.getByRole('button', { name: /^roll$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Again' }));

    // Still the roll dialog, with the running total, and no result pop-up
    expect(within(dialog).getByText('Total SL after 3 rolls')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Roll Result' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.queryByRole('dialog', { name: 'Roll Dialog' })).not.toBeInTheDocument();

    window.dispatchEvent(new Event('beforeunload'));
    const rolls = loadCharacter(id)?.eventLog?.filter((e) => e.category === 'roll') ?? [];
    expect(rolls).toHaveLength(3);
    expect(rolls.every((e) => e.payload.name === 'Willpower')).toBe(true);
  });
});
