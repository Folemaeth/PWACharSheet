# Implementation Plan

## Overview

Behavior-preserving decomposition of `src/components/pages/CharacterPage.tsx` into a composing shell plus focused units under `src/components/pages/character/`. Every extracted unit imports the SAME `../CharacterPage.module.css` so class names stay byte-identical, uses the typed `update`/`updateCharacter` API unchanged, and receives lifted state/setters via props (no Context). After EACH task, run `npx tsc --build --force --noEmit` and the full test suite; existing test assertions must remain UNCHANGED (a forced change is a behavior-change red flag to surface). Tasks 1–7 are largely independent; Task 6 depends on Task 4; Task 8 is the final verification.

## Tasks

- [x] 1. Extract the Compact_Mode summary into `character/CompactSummary.tsx`
  - Move the `displayMode === 'compact'` summary block (name/species/career, wounds via `computeWoundMaximum`, characteristics grid, equipped weapons) into a `{ character }`-only component; render it from the shell.
  - Add an additive unit test rendering CompactSummary with a sample character; assert DOM/class parity. Run tsc + full suite; confirm green with existing assertions unchanged.
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 7.1, 7.5_

- [x] 2. Extract personal-details generation logic and section
  - [x] 2.1 Create `character/usePersonalDetailsGeneration.ts` — move the age/height/hair/eyes/dwarf-alternate/2nd-eye roll handlers plus transient state (`selectedAgeTier`, `firstEyeColour`, `showSecondEyeRoll`) and the species-change reset effect (keyed on `prevSpeciesRef`). `Math.random` copied verbatim (no RNG change). Add a hook unit test with mocked/seeded `Math.random`.
    - _Requirements: 1.2, 2.1, 5.2, 8.3, 4.3_
  - [x] 2.2 Create `character/PersonalDetailsSection.tsx` — move the Portrait + Personal Details card + Generate panel; consume the hook; inject `update`/`updateCharacter`/portrait props; wire into the shell. Run tsc + full suite; confirm green.
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 4.1, 4.2, 7.1, 7.5_

- [x] 3. Extract `character/CharacteristicsSection.tsx`
  - Move the characteristics table + movement + wound-maximum panel. Move `showTBonus` to local state in this unit. Preserve `CharCurrentCell` / `TooltipTriggerCell` CB-breakdown wiring; keep the single-tooltip-at-a-time invariant by injecting `charTooltip`/`breakdownTooltip` state + `openBreakdownTooltip`/`closeBreakdownTooltip` from the shell.
  - Add an additive unit test including a calculated-total breakdown tooltip assertion via the shared Tooltip. Run tsc + full suite; confirm green.
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 3.4, 5.1, 5.4, 5.5, 6.3, 6.4, 4.1, 4.2, 7.1, 7.5_

- [x] 4. Extract `character/useWealthTransfer.ts`
  - Move `applyTransfer` (Wealth to Treasury: single `updateCharacter` writing wGC/wSS/wD + estate.treasury + ledger + `mirrorLedger`) VERBATIM plus `depositError` state into the hook. No mutation-logic change.
  - Add a hook unit test: deposit math, ledger entry, and the insufficient-funds/zero-amount error path (nothing mutated). Run tsc + full suite; confirm green.
  - _Requirements: 1.2, 2.1, 5.2, 6.1, 6.2, 8.4, 4.3, 7.1, 7.5_

- [x] 5. Extract `character/AbilitiesTab.tsx` (mandatory seam e)
  - Move SkillFilter + Basic Skills + Advanced Skills (+Add dropdown) + Talents (+Add dropdown) + Spells & Prayers (conditional visibility predicate copied verbatim; +Add dropdown; expandable effect rows) + Known Runes + Rune Management. Inject `entities` (useCharacterEntities), tooltip/breakdown state, `addDropdown`/`setAddDropdown`, picker setters, `deleteTarget`, skill-filter state, `careerSkillSet`, `openSkillRoll`.
  - Add additive unit tests; verify skill-total breakdown tooltips preserved. Run tsc + full suite; confirm green.
  - _Requirements: 1.1, 1.2, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 4.1, 4.2, 7.1, 7.5_

- [x] 6. Extract `character/GearTab.tsx` (mandatory seam f)
  - Move the trappings grid (drag-reorder via injected `useDragReorder` props + long-press context menu via injected `useLongPress` handlers + `trappingContextMenu`), currency/coin-purse + Wealth-to-Treasury deposit (consume `useWealthTransfer` from Task 4), ConsumablesPanel, DiseasePanel, CorruptionCard, and the encumbrance display. Inject `coinWeight`/`maxEncumbrance`, `entities`, picker/editing/delete setters.
  - Add additive unit tests. Run tsc + full suite; confirm green.
  - _Requirements: 1.1, 1.2, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 6.1, 6.2, 4.1, 4.2, 7.1, 7.5_

- [x] 7. Extract `character/NotesTab.tsx`
  - Move SessionNotesPanel + TimelineView (event log) + ambitions/party fields. Inject `updateCharacter`, `rollHistory`, `clearHistory`. Add an additive unit test. Run tsc + full suite; confirm green.
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 7.1, 7.5_

- [x] 8. Final shell slim-down and full verification
  - Confirm CharacterPage.tsx is reduced to composition + Lifted_State ownership and is materially smaller than pre-refactor (Req 1.1). Confirm no Lifted_State is duplicated across owners (Req 5.4) and the single-tooltip invariant holds (Req 5.5).
  - Run all gates: `tsc --build --force --noEmit` zero errors; eslint zero errors with no new `react-refresh/only-export-components` warnings (each component in its own file); production build clean; full suite passing with all existing assertions unchanged. Verify non-goals held (Req 8).
  - _Requirements: 1.1, 1.5, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4_

## Notes

- This is a pure structural refactor: no behavior, DOM, ARIA, CSS-class, mechanics, visual, or persistence changes (Req 3, Req 8).
- Existing test assertions must NOT be modified; new unit tests are additive only. A forced assertion change signals a behavior change and must be surfaced (Req 4.2, 4.4).
- `applyTransfer` mutation logic and personal-details RNG behavior are copied verbatim — do not alter them.
- Each extracted component lives in its own file and exports only its component to avoid `react-refresh/only-export-components` regressions (Req 7.2, 7.3).
- Property-based testing is not central here; correctness is protected by the unchanged existing suite (rendered-output/behavior invariance) plus additive unit tests for the extracted hooks/components.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2.1", "3", "4", "5", "7"] },
    { "id": 1, "tasks": ["2.2", "6"] },
    { "id": 2, "tasks": ["8"] }
  ]
}
```
