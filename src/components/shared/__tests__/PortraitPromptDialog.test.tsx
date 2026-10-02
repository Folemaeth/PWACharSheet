import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PortraitPromptDialog } from '../PortraitPromptDialog';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const companion = {
  name: 'Rex', species: 'Dog', M: 6, WS: 25, BS: 0, S: 25, T: 25, I: 30,
  Ag: 35, Dex: 0, Int: 10, WP: 20, Fel: 10, W: 8, wCur: 8, traits: '', trained: [], notes: '',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PortraitPromptDialog', () => {
  it('renders a dialog with the generated prompt in a textarea', () => {
    render(
      <PortraitPromptDialog
        character={makeCharacter({ name: 'Gunther', species: 'Human / Reiklander' })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog', { name: /generate portrait prompt/i })).toBeInTheDocument();
    const textarea = screen.getByLabelText('Generated portrait prompt') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Gunther');
    expect(textarea.value).toMatch(/Warhammer Fantasy/i);
  });

  it('disables the retinue toggle and notes when there is no retinue', () => {
    render(<PortraitPromptDialog character={makeCharacter()} onClose={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox).toBeDisabled();
    expect(screen.getByText(/none to include/i)).toBeInTheDocument();
  });

  it('enables the retinue toggle and injects retinue into the prompt when checked', () => {
    render(
      <PortraitPromptDialog
        character={makeCharacter({ species: 'Human / Reiklander', companions: [companion] })}
        onClose={vi.fn()}
      />,
    );
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox).not.toBeDisabled();

    const textarea = screen.getByLabelText('Generated portrait prompt') as HTMLTextAreaElement;
    expect(textarea.value).not.toContain('Rex');

    fireEvent.click(checkbox);
    expect(textarea.value).toContain('Rex');
  });

  it('copies the prompt to the clipboard and shows confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <PortraitPromptDialog
        character={makeCharacter({ name: 'Ava', species: 'High Elf' })}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /copy prompt/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    expect(writeText.mock.calls[0][0]).toContain('Ava');
    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
  });

  it('defaults to portrait (bust) framing and switches to full body on toggle', () => {
    render(
      <PortraitPromptDialog
        character={makeCharacter({ name: 'Ava', species: 'High Elf' })}
        onClose={vi.fn()}
      />,
    );
    const textarea = screen.getByLabelText('Generated portrait prompt') as HTMLTextAreaElement;
    // Default: bust framing, no full-length instruction.
    expect(textarea.value).toMatch(/waist or chest up/i);
    expect(textarea.value).not.toMatch(/head to toe/i);

    fireEvent.click(screen.getByRole('radio', { name: /full body/i }));
    expect(textarea.value).toMatch(/head to toe/i);
    expect(textarea.value).not.toMatch(/waist or chest up/i);

    fireEvent.click(screen.getByRole('radio', { name: /portrait \(bust\)/i }));
    expect(textarea.value).toMatch(/waist or chest up/i);
  });

  it('never describes a background regardless of framing', () => {
    render(
      <PortraitPromptDialog character={makeCharacter({ species: 'Dwarf' })} onClose={vi.fn()} />,
    );
    const textarea = screen.getByLabelText('Generated portrait prompt') as HTMLTextAreaElement;
    expect(textarea.value).not.toMatch(/background/i);
    fireEvent.click(screen.getByRole('radio', { name: /full body/i }));
    expect(textarea.value).not.toMatch(/background/i);
  });

  it('calls onClose when the Close button is clicked', () => {
    const onClose = vi.fn();
    render(<PortraitPromptDialog character={makeCharacter()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<PortraitPromptDialog character={makeCharacter()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});