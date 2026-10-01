# Requirements Document

## Introduction

This feature adds a **"Create Random Character"** option to the new-character flow of the WFRP4e PWA
character sheet. A single click produces a complete, rules-legal, ready-to-play WFRP 4th Edition
character: a race-appropriate name, a species (rolled on the official Random Species Table), an
eligible career, characteristics, skills, talents, Fate/Resilience, personal details, and full gear
(weapons, armour, trappings) with combat-ready stat blocks. Where the rules allow a choice, the
generator makes an intelligent, career-suited selection rather than a purely random one (for example,
rolled characteristic values are rearranged so the highest land on the career's advance-scheme
characteristics).

All generated game mechanics MUST comply with the official WFRP4e rulebooks under `docs/`
(the `rules-compliance` steering rule). The authoritative source for character creation is the Core
Rulebook, Chapter 1 "Character Creation" (`docs/WarhammerFantasyRoleplay4e.md`, p.23–50). Every
mechanic in this document is traced to a Core page in the Glossary or acceptance criteria. Curated
data that has **no mechanical effect** (name pools) is explicitly flagged as a non-rulebook, curated
flavour extension — not an invented mechanic.

The feature is **additive**: it introduces a new entry point and a new, independently testable
generation module. It does not change the behaviour of the existing six-step `CharacterWizard`, nor
the Quick Start path. The generated character is handed off through the **same** completion contract
the wizard uses — `onComplete(character: Character)` — so persistence, backfill, and navigation are
unchanged.

## Glossary

- **Generator**: The pure character-generation module (proposed `src/logic/random-character-generator.ts`)
  that, given an injectable random-number source, returns a fully-built `Character`.
- **RNG**: The injectable random-number source passed to the Generator. Isolates `Math.random` behind a
  seam so the Generator is deterministic (and unit-testable) when seeded. Mirrors the testing seam used
  by the existing personal-details generation.
- **Character**: The persisted character data structure defined in `src/types/character.ts`
  (schema version `_v: 8`), assembled from `BLANK_CHARACTER`.
- **Random_Species_Table**: The Core d100 species table (Core p.24): 01–90 Human, 91–94 Halfling,
  95–98 Dwarf, 99 High Elf, 00 Wood Elf.
- **Species_Data**: `SPECIES_DATA` in `src/data/species.ts` (characteristic modifiers, movement, Fate,
  Resilience, Extra Points, `woundsUseSB`, species skills/talents, `randomTalentSlots`). Note the
  Human entry is keyed `"Human / Reiklander"`.
- **Career_Scheme**: An entry in `CAREER_SCHEMES` (`src/data/careers.ts`); each level has a title,
  status, three-to-six advance-scheme characteristics, eight skills, four talents, and optional
  level-1 trappings.
- **Advance_Scheme_Characteristics**: The three characteristics listed (unshaded) at a career's first
  level — the ones a creation character may advance (Core p.34).
- **Eligible_Career**: A career returned by `getEligibleCareers(species)` in
  `src/logic/career-eligibility.ts` — a career whose species restrictions permit the generated species.
- **Class_Trappings**: The general starting equipment determined by a character's Class (Core p.37
  "Class Trappings"). Proposed new data file `src/data/class-trappings.ts`.
- **Career_Trappings**: The level-1 trappings listed for a career (`CareerLevel.trappings`), granted at
  creation (Core p.36 "Career Trappings").
- **Starting_Wealth**: The initial money determined by the career level's Status Tier and Standing
  (Core p.37): Brass = 2d10 brass pennies per Status Level; Silver = 1d10 silver shillings per Status
  Level; Gold = 1 Gold Crown per Status Level.
- **Trapping_Resolver**: The helper that maps a granted trapping string to a concrete item — a full
  weapon stat block (from `WEAPONS`), a full armour stat block (from `ARMOURS`), or a named trapping —
  including resolution of ambiguous entries.
- **Name_Pool**: Curated, per-species lists of lore-appropriate names (proposed
  `src/data/character-names.ts`). **Flavour only, with no mechanical effect**; not a rulebook table.
- **Bonus_XP**: Experience Points awarded by Core for accepting random outcomes during creation
  (species +20, Core p.24; characteristics rearrange +25, Core p.33; career — see Requirement 10 and
  the design open question). Left **unspent** by this feature.
- **New_Character_Screen**: The entry-point UI surfaces — `NewCharacterChoice.tsx` (modal when
  characters already exist) and the initial mode of `WelcomeScreen.tsx`.
- **Completion_Contract**: The `onComplete(character: Character)` callback that both entry points use to
  hand a finished character to `App` / `WelcomeScreen` for creation and persistence.
- **Tooltip**: The shared `src/components/shared/Tooltip.tsx` component used to show calculated-total
  breakdowns (the `calculated-totals` steering rule).

## Requirements

### Requirement 1: One-click generation of a complete character

**User Story:** As a player, I want to create a complete random character with a single action, so that
I can get a ready-to-play WFRP4e character without stepping through the wizard.

#### Acceptance Criteria

1. WHERE a user is on the New_Character_Screen, THE New_Character_Screen SHALL present a "Create Random
   Character" control alongside the existing wizard and quick-start controls.
2. WHEN the user activates the "Create Random Character" control, THE Generator SHALL produce a complete
   Character and THE New_Character_Screen SHALL hand that Character to the Completion_Contract.
3. THE Generator SHALL return a Character assembled from `BLANK_CHARACTER` with schema version `_v: 8`.
4. THE Generator SHALL populate species, class, career, careerLevel, careerPath, and status fields of
   the returned Character.
5. WHEN the Generator is invoked with a given seeded RNG, THE Generator SHALL return the identical
   Character on every invocation with that same seeded RNG.

### Requirement 2: Race-appropriate random name

**User Story:** As a player, I want the generated character to have a name that fits its species, so
that the character feels lore-appropriate from the start.

#### Acceptance Criteria

1. WHEN the Generator assigns a name, THE Generator SHALL select the name at random from the Name_Pool
   that corresponds to the generated species.
2. THE Generator SHALL provide a Name_Pool for every species in `SPECIES_OPTIONS`.
3. IF the generated species has no dedicated Name_Pool entry, THEN THE Generator SHALL select a name
   from a defined fallback Name_Pool rather than producing an empty name.
4. THE Name_Pool data SHALL be documented as curated flavour with no mechanical effect, not as a
   rulebook table.

### Requirement 3: Species via the Core Random Species Table

**User Story:** As a player, I want species chosen using the official random species odds, so that the
distribution matches the rulebook.

#### Acceptance Criteria

1. WHEN the Generator selects a species, THE Generator SHALL roll on the Random_Species_Table using the
   RNG and map the result to a Species_Data key (Core p.24).
2. WHEN the Random_Species_Table result is Human, THE Generator SHALL map it to the Species_Data key
   `"Human / Reiklander"`.
3. THE Generator SHALL use the Random_Species_Table probabilities 01–90 Human, 91–94 Halfling, 95–98
   Dwarf, 99 High Elf, 00 Wood Elf (Core p.24).

### Requirement 4: Career random but eligible for the species

**User Story:** As a player, I want a career that my species is actually allowed to take, so that the
character is legal to play.

#### Acceptance Criteria

1. WHEN the Generator selects a career, THE Generator SHALL select it at random from the set returned
   by `getEligibleCareers(species)` for the generated species.
2. THE Generator SHALL select a career whose Career_Scheme has a defined level-1 entry.
3. THE Generator SHALL set the Character's class to the selected career's class and the careerLevel to
   the career's level-1 title.

### Requirement 5: Characteristics rolled, rearranged, and modified within creation limits

**User Story:** As a player, I want characteristics rolled per the rules but arranged to suit my career,
so that my character is both rules-legal and effective.

#### Acceptance Criteria

1. WHEN the Generator determines characteristics, THE Generator SHALL roll 2d10 once for each of the ten
   characteristics using the RNG (Core p.33).
2. WHEN the Generator has the ten rolled values, THE Generator SHALL rearrange the rolled values so that
   the highest values are assigned to the career's Advance_Scheme_Characteristics (the "rearrange"
   method, Core p.33 Step 2).
3. THE Generator SHALL set each characteristic's initial value to the assigned rolled value plus that
   characteristic's Species_Data modifier (Core p.33, Attributes Table).
4. THE Generator SHALL distribute exactly 5 characteristic Advances across the career's
   Advance_Scheme_Characteristics (Core p.34).
5. THE Generator SHALL assign no characteristic Advances to any characteristic outside the career's
   Advance_Scheme_Characteristics.
6. THE Generator SHALL record each characteristic as initial, advance, and bonus components matching the
   `CharacteristicValue` shape used by `BLANK_CHARACTER`.

### Requirement 6: Species skills allocated within creation limits

**User Story:** As a player, I want my species skill advances applied per the rules, so that my starting
skills are legal.

#### Acceptance Criteria

1. WHEN the Generator applies species skills, THE Generator SHALL choose 3 species skills to receive +5
   Advances each and 3 different species skills to receive +3 Advances each (Core p.35).
2. WHERE a chosen species skill is a Basic skill present on the Character, THE Generator SHALL add the
   Advances to that Basic skill entry.
3. WHERE a chosen species skill is not present as a Basic skill, THE Generator SHALL add the skill as an
   Advanced skill entry with the correct linked characteristic and the allocated Advances.
4. THE Generator SHALL set the Character's `speciesSkills` to the species' skill list.

### Requirement 7: Species talents allocated, including choices and random talents

**User Story:** As a player, I want my species talents resolved automatically, so that choices and
random-talent slots are filled legally.

#### Acceptance Criteria

1. WHEN the Generator applies species talents, THE Generator SHALL grant each fixed species talent
   (Core p.35).
2. WHERE a species talent entry presents an "A or B" choice, THE Generator SHALL select exactly one of
   the offered talents using the RNG.
3. WHERE the species has random talent slots (`randomTalentSlots`), THE Generator SHALL fill each slot
   by rolling on the Random Talent table via `rollRandomTalent` (Core p.35).
4. IF a rolled random talent duplicates a talent the Character already has, THEN THE Generator SHALL
   reroll until a non-duplicate is obtained (Core p.35).
5. THE Generator SHALL set the Character's `speciesTalents` to the species' talent list.

### Requirement 8: Career skills and one career talent allocated within creation limits

**User Story:** As a player, I want my 40 career skill advances and a career talent assigned per the
rules, so that my career proficiency is legal.

#### Acceptance Criteria

1. WHEN the Generator applies career skills, THE Generator SHALL distribute a total of exactly 40
   Advances across the eight level-1 career skills (Core p.35).
2. THE Generator SHALL allocate no more than 10 Advances to any single career skill during this
   distribution (Core p.35).
3. THE Generator SHALL select exactly one talent from the four level-1 career talents (Core p.35).
4. THE Generator SHALL ensure every level-1 career skill exists on the Character after allocation.

### Requirement 9: Derived attributes set from species data

**User Story:** As a player, I want Fate, Resilience, Fortune, Resolve, and Movement set from my
species, so that these attributes match the rulebook.

#### Acceptance Criteria

1. THE Generator SHALL set the Character's Fate to the species base Fate plus any Extra Points assigned
   to Fate, and SHALL set Fortune equal to Fate (Core p.33–34).
2. THE Generator SHALL set the Character's Resilience to the species base Resilience plus any Extra
   Points assigned to Resilience, and SHALL set Resolve equal to Resilience (Core p.33–34).
3. THE Generator SHALL distribute exactly the species' Extra Points between Fate and Resilience
   (Core p.33, Attributes Table).
4. THE Generator SHALL set Movement to the species Movement value, with walk equal to twice Movement
   and run equal to four times Movement, matching the app's `move` representation.
5. THE Generator SHALL set the Character's `woundsUseSB` from the species' `woundsUseSB` value
   (Core p.33, Attributes Table; Halflings exclude the Strength Bonus).
6. THE Generator SHALL set the Character's `speciesExtraPoints` to the species' Extra Points value.

### Requirement 10: Bonus XP awarded per Core randomization rules and left unspent

**User Story:** As a player, I want the standard random-creation XP awarded but unspent, so that I can
spend it myself later.

#### Acceptance Criteria

1. WHEN the Generator finishes building the Character, THE Generator SHALL award +20 XP for the random
   species result (Core p.24).
2. WHEN the Generator finishes building the Character, THE Generator SHALL award +25 XP for the
   characteristic rearrange method (Core p.33, Step 2).
3. WHEN the Generator awards Bonus_XP, THE Generator SHALL award the career-randomization XP determined
   by the design (see design open question for the Core-sourced value).
4. THE Generator SHALL set the Character's `xpCur` and `xpTotal` to the total Bonus_XP and SHALL set
   `xpSpent` to 0.

### Requirement 11: Full gear with combat-ready stat blocks

**User Story:** As a player, I want complete starting gear with full combat stats, so that my character
is ready to fight without manual data entry.

#### Acceptance Criteria

1. WHEN the Generator assembles gear, THE Generator SHALL grant the career's level-1 Career_Trappings
   (Core p.36).
2. WHEN the Generator assembles gear, THE Generator SHALL grant the Class_Trappings for the Character's
   class (Core p.37).
3. WHERE a granted trapping entry offers an "A or B" choice, THE Trapping_Resolver SHALL resolve it to a
   single concrete item.
4. WHERE a granted trapping entry is a generic category (for example a generic trade tool or a
   "Melee Weapon (Basic or Cavalry)" entry), THE Trapping_Resolver SHALL map it to a defined concrete
   item.
5. WHERE a resolved item name matches an entry in `WEAPONS`, THE Trapping_Resolver SHALL add it to the
   Character's weapons with the full stat block (group, encumbrance, reach/range, damage, qualities).
6. WHERE a resolved item name matches an entry in `ARMOURS`, THE Trapping_Resolver SHALL add it to the
   Character's armour with the full stat block (locations, encumbrance, armour points, qualities,
   armour type).
7. WHERE a resolved item name matches no entry in `WEAPONS` or `ARMOURS`, THE Trapping_Resolver SHALL
   store it as a named trapping with quantity 1.
8. WHEN the Generator sets wealth, THE Generator SHALL grant Starting_Wealth computed from the career
   level's Status Tier and Standing (Core p.37).

### Requirement 12: Wounds auto-initialisation path preserved

**User Story:** As a developer, I want wounds to initialise through the existing path, so that the
generator does not duplicate or diverge from the app's wound logic.

#### Acceptance Criteria

1. THE Generator SHALL NOT set the Character's current wounds (`wCur`) directly, relying on the existing
   backfill path that initialises current wounds to the wound maximum for new characters
   (`src/hooks/useCharacter.ts`, Core p.36–37).
2. THE Generator SHALL produce a Character whose species-derived wound inputs (`woundsUseSB` and the
   characteristics that feed the wound maximum) are populated so the existing wound calculation yields a
   correct maximum.

### Requirement 13: Rulebook traceability and curated-data flagging

**User Story:** As a maintainer, I want every mechanic traced to a rulebook citation and non-mechanical
curated data flagged, so that the feature complies with the project's rules-compliance rule.

#### Acceptance Criteria

1. THE Generator and its supporting data files SHALL cite the Core Rulebook page or section for every
   game mechanic they implement (`rules-compliance` steering rule).
2. THE Name_Pool data SHALL carry a source note stating that names are curated flavour with no
   mechanical effect and are not drawn from a rulebook table.
3. IF a required value cannot be confirmed against the rulebooks, THEN the design SHALL record it as an
   open question with the best-sourced interpretation rather than an invented value.

### Requirement 14: Entry-point accessibility and consistency

**User Story:** As a user relying on assistive technology, I want the new control to be as accessible as
the existing new-character controls, so that I can use it the same way.

#### Acceptance Criteria

1. THE "Create Random Character" control SHALL be a focusable, keyboard-operable button consistent with
   the existing wizard and quick-start buttons on the New_Character_Screen.
2. THE "Create Random Character" control SHALL have an accessible name that conveys its purpose.
3. WHERE the New_Character_Screen manages focus for its controls, THE New_Character_Screen SHALL include
   the "Create Random Character" control in that focus handling consistently with the existing controls.

### Requirement 15: Calculated-total tooltips on any displayed totals

**User Story:** As a user, I want to see how any displayed total was calculated, so that I can trust and
understand the generated numbers (the `calculated-totals` steering rule).

#### Acceptance Criteria

1. WHERE the feature displays a calculated total (for example a characteristic total, wound maximum, or
   encumbrance total) on a preview or result surface, THE feature SHALL attach a Tooltip showing the
   contributing components and the formula that produced the total.
2. WHERE a Tooltip shows a breakdown, THE Tooltip SHALL list each contributing value with a meaningful
   label, including components whose value is zero.
3. WHERE the feature hands off directly without displaying calculated totals, THE feature SHALL have no
   additional Tooltip obligation under this requirement.

## Non-Goals

- No multi-level career advancement beyond the first career level.
- No spending of the awarded Bonus_XP (it is left unspent).
- No pre-constraint pickers (for example "generate a Dwarf Warrior"); the first version is full-auto.
- No changes to the existing CharacterWizard or Quick Start behaviour.
