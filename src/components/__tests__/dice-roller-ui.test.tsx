import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { RollDialog } from '../shared/RollDialog';
import { RollResultDisplay } from '../shared/RollResultDisplay';
import { RollHistoryPanel } from '../shared/RollHistoryPanel';
import type { RollResult } from '../../logic/dice-roller';
import type { RollHistoryEntry } from '../../hooks/useRollHistory';
import { RollModifierMemoryContext } from '../../hooks/useRollModifierMemory';

/** Build a mock RollResult with sensible defaults, overridable via partial. */
function mockRollResult(overrides: Partial<RollResult> = {}): RollResult {
  return {
    roll: 32,
    targetNumber: 45,
    baseTarget: 45,
    difficulty: 'Challenging',
    passed: true,
    sl: 1,
    isCritical: false,
    isFumble: false,
    isAutoSuccess: false,
    isAutoFailure: false,
    outcome: 'Marginal Success',
    skillOrCharName: 'Melee (Basic)',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── 11.1 RollDialog renders with skill name, target, and difficulty defaulting to Challenging ───

describe('RollDialog — renders with skill name, target, and difficulty defaulting to Challenging', () => {
  it('displays the skill name as the dialog title', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Melee (Basic)')).toBeInTheDocument();
  });

  it('displays the base target number', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    // Both base target and modified target show "45" (Challenging = +0),
    // so verify at least one instance is present
    const matches = screen.getAllByText('45');
    expect(matches.length).toBeGreaterThanOrEqual(1);
    // Verify the "Base Target" label is present alongside the value
    expect(screen.getByText('Base Target')).toBeInTheDocument();
  });

  it('defaults the difficulty selector to "Challenging"', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    expect(select).toHaveValue('Challenging');
  });
});


// ─── 11.2 RollDialog difficulty selector contains all 7 difficulty levels ────

describe('RollDialog — difficulty selector contains all 7 difficulty levels', () => {
  it('contains all 7 WFRP 4e difficulty options', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const select = screen.getByRole('combobox', { name: /difficulty/i });
    const options = Array.from(select.querySelectorAll('option'));

    expect(options).toHaveLength(7);

    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain('Very Easy (+60)');
    expect(optionTexts).toContain('Easy (+40)');
    expect(optionTexts).toContain('Average (+20)');
    expect(optionTexts).toContain('Challenging (+0)');
    expect(optionTexts).toContain('Difficult (-10)');
    expect(optionTexts).toContain('Hard (-20)');
    expect(optionTexts).toContain('Very Hard (-30)');
  });
});

// ─── 11.3 RollResultDisplay shows roll value, target, SL, and outcome description ───

describe('RollResultDisplay — shows roll value, target, SL, and outcome description', () => {
  const result = mockRollResult({
    roll: 32,
    targetNumber: 45,
    sl: 1,
    passed: true,
    outcome: 'Marginal Success',
    skillOrCharName: 'Dodge',
  });

  it('displays the d100 roll value', async () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    // The component has a brief rolling animation (300ms) before showing the value.
    // Use findByText to wait for the animation to complete.
    expect(await screen.findByText('32')).toBeInTheDocument();
  });

  it('displays the target number', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/Target:\s*45/)).toBeInTheDocument();
  });

  it('displays the SL with + prefix for positive values', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/SL \+1/)).toBeInTheDocument();
  });

  it('displays the outcome description', () => {
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText('Marginal Success')).toBeInTheDocument();
  });

  it('displays SL with - prefix for negative values', () => {
    const failResult = mockRollResult({
      roll: 78,
      targetNumber: 45,
      sl: -3,
      passed: false,
      outcome: 'Failure',
    });
    render(<RollResultDisplay result={failResult} onClose={vi.fn()} />);
    expect(screen.getByText(/SL -3/)).toBeInTheDocument();
  });
});

// ─── 11.4 RollResultDisplay shows Critical indicator when isCritical is true ───

describe('RollResultDisplay — Critical indicator', () => {
  it('shows "Critical" text when result.isCritical is true', () => {
    const critResult = mockRollResult({
      roll: 11,
      targetNumber: 45,
      sl: 3,
      passed: true,
      isCritical: true,
      outcome: 'Astounding Success',
    });
    render(<RollResultDisplay result={critResult} onClose={vi.fn()} />);
    expect(screen.getByText('Critical')).toBeInTheDocument();
  });

  it('does not show "Critical" text when result.isCritical is false', () => {
    const normalResult = mockRollResult({ isCritical: false });
    render(<RollResultDisplay result={normalResult} onClose={vi.fn()} />);
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
  });
});

// ─── 11.5 RollResultDisplay shows Fumble indicator when isFumble is true ───

describe('RollResultDisplay — Fumble indicator', () => {
  it('shows "Fumble" text when result.isFumble is true', () => {
    const fumbleResult = mockRollResult({
      roll: 88,
      targetNumber: 45,
      sl: -4,
      passed: false,
      isFumble: true,
      outcome: 'Astounding Failure',
    });
    render(<RollResultDisplay result={fumbleResult} onClose={vi.fn()} />);
    expect(screen.getByText('Fumble')).toBeInTheDocument();
  });

  it('does not show "Fumble" text when result.isFumble is false', () => {
    const normalResult = mockRollResult({ isFumble: false });
    render(<RollResultDisplay result={normalResult} onClose={vi.fn()} />);
    expect(screen.queryByText('Fumble')).not.toBeInTheDocument();
  });
});


// ─── 11.6 RollResultDisplay opposed SL input calculates and displays net SL ───

describe('RollResultDisplay — opposed SL input calculates and displays net SL', () => {
  it('calculates and displays net SL and winner when opponent SL is entered', async () => {
    const result = mockRollResult({
      sl: 3,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '1');

    // Net SL = 3 - 1 = +2
    expect(screen.getByText(/Net SL:\s*\+2/)).toBeInTheDocument();
    expect(screen.getByText('You win!')).toBeInTheDocument();
  });

  it('shows opponent wins when net SL is negative', async () => {
    const result = mockRollResult({
      sl: 1,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '4');

    // Net SL = 1 - 4 = -3
    expect(screen.getByText(/Net SL:\s*-3/)).toBeInTheDocument();
    expect(screen.getByText('Opponent wins!')).toBeInTheDocument();
  });

  it('shows tie when net SL is zero', async () => {
    const result = mockRollResult({
      sl: 2,
      passed: true,
    });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);

    const input = screen.getByRole('spinbutton', { name: /opponent sl/i });
    await userEvent.clear(input);
    await userEvent.type(input, '2');

    // Net SL = 2 - 2 = 0
    expect(screen.getByText(/Net SL:\s*\+0/)).toBeInTheDocument();
    expect(screen.getByText('Tie!')).toBeInTheDocument();
  });
});

// ─── 11.7 RollHistoryPanel displays entries in order and clear button works ───

describe('RollHistoryPanel — displays entries and clear button works', () => {
  const entries: RollHistoryEntry[] = [
    {
      id: 3,
      result: mockRollResult({ skillOrCharName: 'Cool', roll: 88, targetNumber: 40, sl: -5, passed: false }),
    },
    {
      id: 2,
      result: mockRollResult({ skillOrCharName: 'Athletics', roll: 55, targetNumber: 60, sl: 1, passed: true }),
    },
    {
      id: 1,
      result: mockRollResult({ skillOrCharName: 'Dodge', roll: 10, targetNumber: 50, sl: 4, passed: true }),
    },
  ];

  it('displays entries in the order provided (reverse chronological) after expanding', () => {
    render(<RollHistoryPanel history={entries} onClear={vi.fn()} />);

    // Click the header to expand
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));

    const skillNames = screen.getAllByText(/Cool|Athletics|Dodge/);
    expect(skillNames[0]).toHaveTextContent('Cool');
    expect(skillNames[1]).toHaveTextContent('Athletics');
    expect(skillNames[2]).toHaveTextContent('Dodge');
  });

  it('shows "Clear History" button when entries exist and calls onClear when clicked', () => {
    const onClear = vi.fn();
    render(<RollHistoryPanel history={entries} onClear={onClear} />);

    // Expand the panel
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));

    const clearBtn = screen.getByRole('button', { name: /clear history/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows entry count in the header', () => {
    render(<RollHistoryPanel history={entries} onClear={vi.fn()} />);
    expect(screen.getByText(/Roll History \(3\)/)).toBeInTheDocument();
  });

  it('shows "No rolls yet" when history is empty', () => {
    render(<RollHistoryPanel history={[]} onClear={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /roll history/i }));
    expect(screen.getByText('No rolls yet')).toBeInTheDocument();
  });
});

// ─── #11 Manual dice entry ───────────────────────────────────────────────────

describe('RollDialog — manual dice entry mode', () => {
  it('auto mode (default) has no manual d100 input and rolls without input', () => {
    const onRoll = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="auto"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByLabelText('Your d100 roll')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^roll$/i }));
    expect(onRoll).toHaveBeenCalledTimes(1);
  });

  it('manual mode shows a d100 input and the action button reads "Resolve"', () => {
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Your d100 roll')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^roll$/i })).not.toBeInTheDocument();
  });

  it('manual mode resolves using the entered d100 value', () => {
    const onRoll = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));

    expect(onRoll).toHaveBeenCalledTimes(1);
    const result = onRoll.mock.calls[0][0] as RollResult;
    expect(result.roll).toBe(32);
    // baseTarget 45, Challenging (+0) → target 45; 32 <= 45 so it passes.
    expect(result.targetNumber).toBe(45);
    expect(result.passed).toBe(true);
  });

  it('manual mode rejects an out-of-range value and does not resolve', () => {
    const onRoll = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));

    expect(onRoll).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/between 1 and 100/i);
  });

  it('manual mode requires a value before resolving', () => {
    const onRoll = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(onRoll).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

// ─── SL modifier ─────────────────────────────────────────────────────────────

describe('RollDialog — SL modifier', () => {
  /** Resolve a manual roll of `roll` against target 45 with `modifier` typed in. */
  function resolveWithModifier(roll: string, modifier: string): RollResult {
    const onRoll = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Channelling"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: modifier } });
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: roll } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    return onRoll.mock.calls[0][0] as RollResult;
  }

  it('shows an empty SL Modifier field that leaves the SL alone', () => {
    const result = resolveWithModifier('32', '');
    // 32 vs 45 → SL +1
    expect(result.sl).toBe(1);
  });

  it('adds a positive modifier to the SL', () => {
    const result = resolveWithModifier('32', '2');
    expect(result.sl).toBe(3);
    expect(result.passed).toBe(true);
  });

  it('a negative modifier lowers the SL but a passed roll stays passed', () => {
    const result = resolveWithModifier('32', '-3');
    expect(result.sl).toBe(-2);
    expect(result.passed).toBe(true);
    expect(result.outcome).toBe('Marginal Success');
  });

  it('applies the modifier to the player SL in an opposed test', () => {
    render(
      <RollDialog
        skillOrCharName="Melee (Basic)"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '32' } });
    fireEvent.click(screen.getByLabelText('Opposed Test'));
    fireEvent.change(screen.getByLabelText('Opponent Target Number'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('Opponent d100 roll'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));

    // You: SL 1 + 2 = 3; opponent: 40 vs 25 → SL 2; net +1
    expect(screen.getByText('SL +3')).toBeInTheDocument();
    expect(screen.getByText('You win!')).toBeInTheDocument();
  });
});

// ─── Target modifier ─────────────────────────────────────────────────────────

describe('RollDialog — target modifier', () => {
  function renderDialog(onRoll = vi.fn()) {
    render(
      <RollDialog
        skillOrCharName="Cool"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onClose={vi.fn()}
      />
    );
    return onRoll;
  }

  it('stacks with the difficulty in the Modified Target shown before rolling', () => {
    renderDialog();
    fireEvent.change(screen.getByRole('combobox', { name: /difficulty/i }), { target: { value: 'Average' } });
    fireEvent.change(screen.getByLabelText('Target Modifier'), { target: { value: '-10' } });
    // 45 + 20 (Average) - 10 = 55
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('rolls against the modified target', () => {
    const onRoll = renderDialog();
    fireEvent.change(screen.getByLabelText('Target Modifier'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '52' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));

    const result = onRoll.mock.calls[0][0] as RollResult;
    // 52 fails against 45 but passes against 45 + 10
    expect(result.targetNumber).toBe(55);
    expect(result.passed).toBe(true);
  });

  it('an empty field leaves the target alone', () => {
    const onRoll = renderDialog();
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect((onRoll.mock.calls[0][0] as RollResult).targetNumber).toBe(45);
  });
});

// ─── Remembered modifiers ────────────────────────────────────────────────────

describe('RollDialog — remembered modifiers', () => {
  const saved = {
    'Channelling (Aqshy)': { targetModifier: 10, slModifier: 2 },
    'Channelling (Hysh)': { targetModifier: 0, slModifier: -1 },
  };

  function renderDialog(name: string, remember = vi.fn(), skillChoice?: Parameters<typeof RollDialog>[0]['skillChoice']) {
    const onRoll = vi.fn();
    render(
      <RollModifierMemoryContext.Provider value={{ saved, remember }}>
        <RollDialog
          skillOrCharName={name}
          baseTarget={45}
          diceEntryMode="manual"
          skillChoice={skillChoice}
          onRoll={onRoll}
          onClose={vi.fn()}
        />
      </RollModifierMemoryContext.Provider>
    );
    return { onRoll, remember };
  }

  it('opens with the modifiers last used for that skill', () => {
    renderDialog('Channelling (Aqshy)');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(10);
    expect(screen.getByLabelText('SL Modifier')).toHaveValue(2);
    // 45 + 10
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('opens empty for a skill with nothing remembered', () => {
    renderDialog('Cool');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(null);
    expect(screen.getByLabelText('SL Modifier')).toHaveValue(null);
  });

  it('rolls with the remembered modifiers without retyping them', () => {
    const { onRoll } = renderDialog('Channelling (Aqshy)');
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));

    const result = onRoll.mock.calls[0][0] as RollResult;
    // target 45 + 10 = 55; SL = 5 - 3 = 2, +2 modifier = 4
    expect(result.targetNumber).toBe(55);
    expect(result.sl).toBe(4);
  });

  it('remembers the modifiers used for the skill when the roll is made', () => {
    const { remember } = renderDialog('Cool');
    fireEvent.change(screen.getByLabelText('Target Modifier'), { target: { value: '-10' } });
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: '1' } });
    expect(remember).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(remember).toHaveBeenCalledWith('Cool', { targetModifier: -10, slModifier: 1 });
  });

  it('does not remember anything when the roll is not made', () => {
    const { remember } = renderDialog('Cool');
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: '3' } });
    // No d100 entered, so Resolve is rejected
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(remember).not.toHaveBeenCalled();
  });

  it('switching skill loads the modifiers remembered for the new skill', () => {
    const onChange = vi.fn();
    renderDialog('Channelling (Aqshy)', vi.fn(), {
      options: [
        { name: 'Channelling (Aqshy)', target: 45 },
        { name: 'Channelling (Hysh)', target: 40 },
      ],
      onChange,
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Skill' }), { target: { value: 'Channelling (Hysh)' } });

    expect(onChange).toHaveBeenCalledWith('Channelling (Hysh)');
    expect(screen.getByLabelText('Target Modifier')).toHaveValue(null);
    expect(screen.getByLabelText('SL Modifier')).toHaveValue(-1);
  });
});

// ─── Extended Test ───────────────────────────────────────────────────────────

describe('RollDialog — Extended Test', () => {
  function renderDialog(props: Partial<Parameters<typeof RollDialog>[0]> = {}) {
    const onRoll = vi.fn();
    const onExtendedRoll = vi.fn();
    const onClose = vi.fn();
    render(
      <RollDialog
        skillOrCharName="Trade (Smith)"
        baseTarget={45}
        diceEntryMode="manual"
        onRoll={onRoll}
        onExtendedRoll={onExtendedRoll}
        onClose={onClose}
        {...props}
      />
    );
    return { onRoll, onExtendedRoll, onClose };
  }

  /** Enter a d100 result and resolve it. */
  function rollManual(value: string) {
    fireEvent.change(screen.getByLabelText('Your d100 roll'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
  }

  it('is off by default and rolls a single test as before', () => {
    const { onRoll, onExtendedRoll } = renderDialog();
    expect(screen.getByLabelText('Extended Test')).not.toBeChecked();
    rollManual('32');
    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onExtendedRoll).not.toHaveBeenCalled();
  });

  it('keeps the dialog open and adds each roll to a running SL total', () => {
    const { onRoll, onExtendedRoll } = renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));

    rollManual('32'); // SL +1
    expect(screen.getByText('Total SL after 1 roll')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();

    rollManual('18'); // SL +3
    rollManual('78'); // SL -3
    expect(screen.getByText('Total SL after 3 rolls')).toBeInTheDocument();
    // +1 +3 -3
    expect(screen.getByText('+1')).toBeInTheDocument();

    expect(onRoll).not.toHaveBeenCalled();
    expect(onExtendedRoll).toHaveBeenCalledTimes(3);
    expect((onExtendedRoll.mock.calls[2][0] as RollResult).sl).toBe(-3);
  });

  it('a failed roll counts against the total', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    rollManual('32'); // SL +1
    rollManual('91'); // SL -5
    expect(screen.getByText('-4')).toBeInTheDocument();
  });

  it('lists every roll, newest first, with its SL and pass or fail', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    rollManual('32');
    rollManual('78');

    const rows = within(screen.getByRole('list', { name: 'Extended Test rolls' })).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('#2');
    expect(rows[0]).toHaveTextContent('78 vs 45');
    expect(rows[0]).toHaveTextContent('SL -3 Fail');
    expect(rows[1]).toHaveTextContent('#1');
    expect(rows[1]).toHaveTextContent('SL +1 Pass');
  });

  it('flags doubles as a Critical on a pass and a Fumble on a fail', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    rollManual('32');
    rollManual('22'); // double, passed
    rollManual('77'); // double, failed

    const rows = within(screen.getByRole('list', { name: 'Extended Test rolls' })).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent('Fumble');
    expect(rows[1]).toHaveTextContent('Critical');
    expect(rows[2]).not.toHaveTextContent(/Critical|Fumble/);
  });

  it('applies the modifiers to every roll', () => {
    const { onExtendedRoll } = renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    fireEvent.change(screen.getByLabelText('Target Modifier'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('SL Modifier'), { target: { value: '1' } });
    rollManual('32'); // target 55 → SL 2, +1 = 3
    rollManual('52'); // target 55 → SL 0, +1 = 1

    expect((onExtendedRoll.mock.calls[0][0] as RollResult).sl).toBe(3);
    expect((onExtendedRoll.mock.calls[1][0] as RollResult).sl).toBe(1);
    expect(screen.getByText('+4')).toBeInTheDocument();
  });

  it('clears the manual d100 field for the next roll', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    rollManual('32');
    expect(screen.getByLabelText('Your d100 roll')).toHaveValue(null);
  });

  it('offers Finish once a roll is made, which closes the dialog', () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();

    rollManual('32');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-roll mode offers Roll Again after the first roll', () => {
    const { onExtendedRoll } = renderDialog({ diceEntryMode: 'auto' });
    fireEvent.click(screen.getByLabelText('Extended Test'));
    fireEvent.click(screen.getByRole('button', { name: /^roll$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Again' }));
    expect(onExtendedRoll).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Total SL after 2 rolls')).toBeInTheDocument();
  });

  it('cannot be switched off or made Opposed once under way', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Extended Test'));
    rollManual('32');
    expect(screen.getByLabelText('Extended Test')).toBeDisabled();
    expect(screen.getByLabelText('Opposed Test')).toBeDisabled();
  });

  it('is either Extended or Opposed, not both', () => {
    renderDialog();
    fireEvent.click(screen.getByLabelText('Opposed Test'));
    fireEvent.click(screen.getByLabelText('Extended Test'));
    expect(screen.getByLabelText('Extended Test')).toBeChecked();
    expect(screen.getByLabelText('Opposed Test')).not.toBeChecked();

    fireEvent.click(screen.getByLabelText('Opposed Test'));
    expect(screen.getByLabelText('Opposed Test')).toBeChecked();
    expect(screen.getByLabelText('Extended Test')).not.toBeChecked();
  });

  it('is not offered when allowExtended is off', () => {
    renderDialog({ allowExtended: false });
    expect(screen.queryByLabelText('Extended Test')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Opposed Test')).toBeInTheDocument();
  });
});

describe('RollResultDisplay — SL modifier', () => {
  it('shows the rolled SL and the modifier behind a modified SL', () => {
    const result = mockRollResult({ sl: 3, slModifier: 2 });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/SL \+3/)).toBeInTheDocument();
    expect(screen.getByText('Rolled SL +1, modifier +2')).toBeInTheDocument();
  });

  it('a passed roll with negative modified SL still reads Pass', () => {
    const result = mockRollResult({ sl: -2, slModifier: -3, passed: true });
    render(<RollResultDisplay result={result} onClose={vi.fn()} />);
    expect(screen.getByText(/SL -2/)).toBeInTheDocument();
    expect(screen.getByText('Pass')).toBeInTheDocument();
  });

  it('shows no modifier line for an unmodified roll', () => {
    render(<RollResultDisplay result={mockRollResult()} onClose={vi.fn()} />);
    expect(screen.queryByText(/modifier/i)).not.toBeInTheDocument();
  });
});
