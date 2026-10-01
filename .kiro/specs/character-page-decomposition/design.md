# Design Document

## Overview

This is a behavior-preserving structural decomposition of `src/components/pages/CharacterPage.tsx` (~2000 lines) into a thin composing shell plus focused child components and hooks under a new `src/components/pages/character/` folder. It changes internal structure only. Rendered DOM, ARIA semantics, CSS module class usage, event behavior, the typed `update`/`updateCharacter` API, calculated-total tooltips, and the persisted `Character` shape all remain identical (Requirements 3, 6, 8). Every existing test must pass with assertions unchanged (Requirement 4); any forced assertion change is a behavior-change red flag to surface rather than absorb (Req 4.4).

The decomposition follows the extraction precedents already present in `src/components/pages/`: `useCharacterEntities` (a hook with injected setters), `CharacterBreakdownTooltips`, `SheetInfoButton`, `characterConstants` (`CHAR_KEYS`/`CHAR_FULL_NAMES`), `CharCurrentCell`, and `CharBreakdownContent`.

## Architecture

CharacterPage becomes a thin SHELL that owns Lifted_State and composes Extracted_Units; the units are dumb-ish children that receive state and setters via props (the `useCharacterEntities` injected-setter pattern). No React Context or providers are introduced, so each unit is renderable/invokable in isolation with plain props/mocks (Req 1.4).

New folder `src/components/pages/character/` holds the Extracted_Units. Each component lives in its own file (Req 7.3), exports ONLY its component (no co-exported non-component values, to avoid `react-refresh/only-export-components` regressions — Req 7.2), and imports the SAME `../CharacterPage.module.css` so `styles.*` class names are byte-identical (Req 3.3).

Files and the seam (a–h from Req 2.1) each covers:

- `character/CompactSummary.tsx` — Compact_Mode summary block (seam a).
- `character/usePersonalDetailsGeneration.ts` — RNG roll handlers + transient generation state + species-change reset effect (part of seam b).
- `character/PersonalDetailsSection.tsx` — Portrait + Personal Details card + Generate panel (seam b).
- `character/CharacteristicsSection.tsx` — characteristics table + movement + wound-maximum panel; owns `showTBonus` locally (seam c).
- `character/AbilitiesTab.tsx` — SkillFilter + Basic/Advanced Skills + Talents + Spells + Known Runes + Rune Management (seam e — MANDATORY per Req 2.2).
- `character/GearTab.tsx` — trappings grid + currency/coin-purse + Wealth-to-Treasury deposit + Consumables + Disease + Corruption + encumbrance (seam f — MANDATORY per Req 2.2).
- `character/NotesTab.tsx` — SessionNotes + TimelineView (event log) + ambitions/party fields (seam g).
- `character/useWealthTransfer.ts` — `applyTransfer` deposit handler + `depositError` state (seam h).

The identity tab (seam d) is composed directly by the shell from PersonalDetailsSection + species-gated panels + CharacteristicsSection + Psychology, rather than adding an extra `IdentityTab` wrapper, to avoid a needless prop-drill layer (see Residual Questions). Pre-existing extracted helpers stay where they are to minimize churn.

This satisfies Req 1.1 (materially smaller shell), Req 1.2 (each concern in its own file), Req 1.3 (one cohesive concern per unit), Req 2.2 (abilities + gear mandatory), and Req 2.1 (candidate seams a–h all addressed).

## Components and Interfaces

All units receive the typed `update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void` and `updateCharacter` unchanged (Req 6.1, 6.2). Lifted_State and setters are injected as props (Req 1.4, 5.2, 5.3).

- **CompactSummary** — props: `{ character }`. Pure render: name/species/career, wounds (via `computeWoundMaximum`), characteristics grid, equipped weapons. No state.
- **usePersonalDetailsGeneration** — `({ character, update })` returns roll handlers (age/height/hair/eyes/dwarf-alternate/2nd-eye) plus `{ selectedAgeTier, setSelectedAgeTier, firstEyeColour, showSecondEyeRoll }` and owns the species-change reset effect (moves out of the shell with its `prevSpeciesRef`). `Math.random` usage is copied verbatim (no RNG change).
- **PersonalDetailsSection** — `{ character, update, updateCharacter, portraitURL, onPortraitUpload, onPortraitRemove, gen }` where `gen` is the hook result.
- **CharacteristicsSection** — `{ character, update, updateCharacter, openCharacteristicRoll, charTooltip, setCharTooltip, breakdownTooltip, openBreakdownTooltip, closeBreakdownTooltip }`; owns `showTBonus` locally.
- **AbilitiesTab** — `{ character, update, updateCharacter, skillSearchText, setSkillSearchText, skillTrainedOnly, onTrainedOnlyChange, careerSkillSet, tooltip, setTooltip, breakdownTooltip, openBreakdownTooltip, closeBreakdownTooltip, expandedSpells, entities, addDropdown, setAddDropdown, setShowAdvSkillPicker, setShowTalentPicker, setShowSpellPicker, setDeleteTarget, openSkillRoll }` (`entities` = the `useCharacterEntities` result).
- **GearTab** — `{ character, update, updateCharacter, coinWeight, maxEncumbrance, entities, trappingsGridRef, trappingsDragState, getTrappingGripProps, getTrappingItemProps, trappingsDropIndex, trappingsAnnouncement, trappingLongPressHandlers, trappingContextMenu, setTrappingContextMenu, setShowTrappingPicker, setEditingTrappingIndex, setDeleteTarget, wealth }` (`wealth` = the `useWealthTransfer` result).
- **NotesTab** — `{ character, updateCharacter, rollHistory, clearHistory }`.
- **useWealthTransfer** — `({ character, updateCharacter })` returns `{ applyTransfer, depositError, setDepositError }`. The `applyTransfer` mutation is copied VERBATIM: a single `updateCharacter` writing `wGC`/`wSS`/`wD` + `estate.treasury` + ledger + `mirrorLedger` (state-safety-core / wealth-treasury-transfer critical — no logic change).

### Lifted-State Ownership (Requirement 5)

Stays in the shell (cross-cutting, drives more than one unit): `activeSubTab` (+ its persistence wrapper and `subTab`-prop sync effect); the single-tooltip-at-a-time trio `tooltip` / `charTooltip` / `breakdownTooltip` with `openBreakdownTooltip`/`closeBreakdownTooltip` (invariant: opening a breakdown tooltip clears `charTooltip`, and opening a CharCurrentCell tooltip clears `breakdownTooltip` — Req 5.5); picker visibility flags `showSpellPicker`/`showAdvSkillPicker`/`showTalentPicker`/`showTrappingPicker`; `deleteTarget`; `rollDialogState`/`rollResultState`; `addDropdown` (+ its document-click close effect); `expandedSpells`; skill-filter state; and the hook wiring (`useCharacterEntities`, `useDragReorder`, `useLongPress`, `useTabOrder`, `useCompactMode`, `usePortrait`).

Moves local to a unit (strictly single-owner): `showTBonus` → CharacteristicsSection; the personal-details generation transient trio + its species-change reset effect → `usePersonalDetailsGeneration`; `depositError` → `useWealthTransfer`. No piece of Lifted_State is duplicated across owners (Req 5.4), and re-render conditions are preserved because everything that drives multiple units stays lifted (Req 5.5).

## Data Models

No data-model changes. The persisted `Character` shape and serialization are untouched (Req 8.4). Units read/write through the existing typed `update`/`updateCharacter` surface only (Req 6.1, 6.2).

## Correctness Properties

These invariants must hold before and after the refactor and are what the existing suite plus new unit tests protect.

### Property 1: Rendered-output invariance

**Validates: Requirements 3.1, 3.2, 3.3**

For equivalent `Character` input, the composed shell produces DOM structure, ARIA roles/attributes/labels, and CSS module class names identical to the pre-refactor output (Req 3.1, 3.2, 3.3).

### Property 2: Event-effect invariance

**Validates: Requirements 3.4**

Interacting with any control in an Extracted_Unit produces the same effect and result as the pre-refactor control (Req 3.4).

### Property 3: Existing tests pass unmodified

**Validates: Requirements 4.1, 4.2, 4.3**

The full suite passes with every existing assertion unchanged; new tests are additive only (Req 4.1, 4.2, 4.3).

### Property 4: Typed-update preservation

**Validates: Requirements 6.1, 6.2**

All units use the typed `update`/`updateCharacter` without widening, weakening, or bypassing compile-time typing (Req 6.1, 6.2).

### Property 5: Calculated-total tooltip preservation

**Validates: Requirements 6.3, 6.4**

Any Calculated_Total rendered by a unit shows the same breakdown content/structure via the shared `Tooltip` component (Req 6.3, 6.4).

### Property 6: Single-tooltip-at-a-time

**Validates: Requirements 5.5**

At most one of `charTooltip` / `breakdownTooltip` is open at any moment, unchanged from today (Req 5.5).

### Property 7: State singularity

**Validates: Requirements 5.4**

No piece of Lifted_State is owned by more than one component (Req 5.4).

### Property 8: Persistence invariance

**Validates: Requirements 3.5, 8.4**

The serialized `Character` is unchanged by the refactor (Req 3.5, 8.4).

## Error Handling

Conditional and species-gated rendering is preserved exactly: DeitySelector (Dwarf priests), GrudgePanel (Dwarves), YenluiPanel (Elves with `useYenlui`), and MagicalBurnoutPanel (High Magic) keep their render guards, including zero-DOM-when-hidden behavior; the Spells & Prayers section visibility predicate is copied verbatim; the compact-vs-expanded conditional and the `data-expanded` attribute are unchanged (Req 3.1, 8.2). The Wealth-to-Treasury deposit failure path (set `depositError`, mutate nothing) is preserved inside `useWealthTransfer`.

## Testing Strategy

- The EXISTING CharacterPage test suite runs against the composed shell and must pass with assertions UNCHANGED — the primary proof that DOM/behavior did not move (Req 4.1, 4.2). A forced assertion change is surfaced as a behavior-change red flag, not silently applied (Req 4.4).
- New unit tests are additive (Req 4.3): render each Extracted_Unit with plain props/mocks; test `useWealthTransfer` (deposit math, ledger entry, error path) and `usePersonalDetailsGeneration` with a mocked/seeded `Math.random`, mirroring the existing PersonalDetails integration tests.
- Calculated-total breakdown tooltips continue to use the shared `Tooltip` / `TooltipTriggerCell` / `CharacterBreakdownTooltips` with identical content and structure (Req 6.3, 6.4).
- Verification gates (Req 7): `tsc --build --force --noEmit` reports zero errors; eslint reports zero errors and no new `react-refresh/only-export-components` warnings (each component in its own file, components-only exports); production build completes cleanly; the full test suite passes.

## Migration / Sequencing

Extract lowest-risk units first and run typecheck + the full suite after EACH step so the app stays green throughout:

1. CompactSummary (leaf, no state).
2. usePersonalDetailsGeneration, then PersonalDetailsSection.
3. CharacteristicsSection (move `showTBonus` local).
4. useWealthTransfer.
5. AbilitiesTab (mandatory).
6. GearTab (mandatory; consumes `useWealthTransfer`).
7. NotesTab.
8. Final shell slim-down: shell reduced to composition + Lifted_State ownership.

## Residual Questions

- Whether to also relocate the pre-existing extracted helpers (`CharacterBreakdownTooltips`, `SheetInfoButton`, `CharCurrentCell`, `CharBreakdownContent`, `characterConstants`) into `character/`. Recommendation: leave them to minimize churn.
- Whether `IdentityTab` should be a real wrapper component or composed directly by the shell. Recommendation: compose directly to avoid an extra prop-drill layer.
