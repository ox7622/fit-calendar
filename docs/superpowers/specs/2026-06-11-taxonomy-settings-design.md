# Configurable difficulty levels & impact types — design

**Date:** 2026-06-11
**Status:** Approved for planning

## Problem

Difficulty levels (`beginner` / `intermediate` / `advanced`) and impact/load types
(`cardio` / `strength` / `flexibility` / `balance`) are hardcoded throughout:

- DB column types on `training_types` (`difficulty` varchar, `impactTypes` text[]).
- `@fitcalendar/shared`: `difficulty-levels.const.ts` (`DIFFICULTY_LEVEL_LABELS`),
  `impact-types.const.ts` (`IMPACT_TYPES`, used by API DTO validation `@IsIn(...)`).
- Labels + colors duplicated in admin (`ImpactTypeBadge`, `TrainingTypesListPage`)
  and mini-app (`ImpactTypeBadge`, `ClassCard`, `ClassDetailPage`, `FilterSheet`).

The club wants to manage both lists themselves: add / rename / recolor / remove /
reorder, like coaches and training types are managed today.

## Goals

- Admin CRUD for difficulty levels and impact types (label, color, order, active).
- Both apps render labels and colors from the database, not hardcoded maps.
- No behaviour change on release: seed the new tables with today's values.
- Safe deletion: a level/type still referenced by a training type can't be removed.

## Non-goals

- No change to how a training type stores its difficulty/impact (still by key).
- No per-class colour overrides; colour lives on the level/type.
- Drag-and-drop reordering (up/down arrows now; drag can come later).
- Arbitrary colours — a fixed brand palette only.

## Decisions (confirmed)

- **Colour:** fixed palette token, not arbitrary hex.
- **Order:** explicit `sortOrder`, managed with up/down arrows.
- **Scope:** full CRUD, both apps read from DB.

## Data model

Two new tables, identical shape:

`difficulty_levels` and `impact_types`:

| column      | type                     | notes                                            |
|-------------|--------------------------|--------------------------------------------------|
| id          | uuid pk                  | settings-table identity (for CRUD)               |
| key         | varchar unique           | stable slug; what `training_types` references    |
| label       | varchar                  | display name (editable, safe)                    |
| color       | varchar                  | palette token (see below); validated ∈ palette   |
| sortOrder   | int                      | ascending; controls picker/badge order           |
| isActive    | boolean default true     | inactive = hidden from pickers, not deleted      |
| createdAt   | timestamptz              |                                                  |
| updatedAt   | timestamptz              |                                                  |

`training_types` is **unchanged**: `difficulty` keeps storing the key string,
`impactTypes` keeps `text[]` of keys. → **zero data migration on `training_types`.**

### Palette

A fixed token set in `@fitcalendar/shared`, e.g.
`TAXONOMY_COLORS = ['green','amber','red','orange','blue','purple','slate','teal']`.
Each app maps token → concrete classes (admin Tailwind classes; mini-app the same),
so contrast is guaranteed in both themes. `color` is validated against this set.

### Key generation

On create, derive `key` from the label (transliterated slug) + uniqueness suffix.
Key is immutable after create; editing the label never changes the key.

## Migration

One migration:

1. `CREATE TABLE difficulty_levels`, `CREATE TABLE impact_types`.
2. Seed `difficulty_levels` with `beginner/intermediate/advanced`, current RU labels
   (`DIFFICULTY_LEVEL_LABELS`), today's colours, `sortOrder` 0/1/2.
3. Seed `impact_types` with `cardio/strength/flexibility/balance`, current RU labels
   and colours, `sortOrder` 0..3.

No FK is added to `training_types` (it references by key, and the migration keeps the
exact same keys), so existing rows keep working with no backfill.

## API

### Admin CRUD (guarded by `AdminAuthGuard`, audited)

Mirror the `admin/training-types` module for each resource:

- `GET    /admin/difficulty-levels`            → all (incl. inactive), ordered
- `POST   /admin/difficulty-levels`            → create (label, color, isActive?)
- `PUT    /admin/difficulty-levels/:id`        → update label/color/isActive
- `PUT    /admin/difficulty-levels/:id/move`   → reorder up/down (swap sortOrder)
- `DELETE /admin/difficulty-levels/:id`        → delete; 409 if referenced
- …identical set under `/admin/impact-types`.

Deletion guard: count `training_types` where `difficulty = key` (or `impactTypes`
contains the key); if > 0 → `409` "Используется в N типах занятий — сначала
переназначьте". Audited via existing `AdminAuditService` (new action keys
`delete_difficulty_level` / `delete_impact_type`, plus create/update if we want them).

### Validation moves from static to service-level

`create/update-training-type.dto.ts` currently use `@IsIn(IMPACT_TYPES)` and a
difficulty `@IsIn([...])`. With dynamic values these become `@IsString()` /
`@IsArray() @IsString({ each: true })`, and `AdminTrainingTypesService` validates
that each key exists and is active in the taxonomy tables (BadRequest otherwise) —
same shape as the existing active-coach / active-type checks in the schedule service.

### Public read (mini-app)

New public endpoint:

- `GET /taxonomy` → `{ difficultyLevels: [{key,label,color,sortOrder}], impactTypes: [...] }`
  (active only, ordered). Cacheable; the mini-app fetches once at startup.

## Admin UI

- New **"Настройки"** area with two managers (difficulty levels, impact types),
  styled like `TrainingTypesListPage`: list rows with colour swatch, label, active
  toggle, up/down, edit, delete; an add form/modal. Add nav entry in `AdminShell`
  (`NAV_ITEMS`) + routes in `Router.tsx`.
- Colour picker = palette swatches (the confirmed fixed set).
- `TrainingTypeForm`: difficulty + impact pickers fetch the active lists from the
  admin API instead of importing `DIFFICULTY_LEVELS` / `IMPACT_TYPES` constants.
- Badges/labels in admin (`ImpactTypeBadge`, difficulty colour map) resolve from the
  fetched taxonomy instead of hardcoded maps.

## Mini-app

- Fetch `/taxonomy` once (provider/store), build `key → {label,color}` maps.
- `ImpactTypeBadge`, `ClassCard`, `ClassDetailPage`, `FilterSheet` read from those
  maps instead of hardcoded constants. Unknown keys fall back to a neutral style.

## Shared lib

- Replace the value constants (`IMPACT_TYPES`, `DIFFICULTY_LEVEL_LABELS`) with the
  palette token set + colour-token type. Difficulty/impact become plain `string`
  keys app-wide (no literal unions). Remove now-dead label/colour maps.

## Sequencing (each step shippable, behaviour stable)

1. **DB** — entities + migration with seed. Nothing else changes; apps still use
   constants. Verifies the seed reproduces current values exactly.
2. **API** — admin CRUD modules + deletion guard + `/taxonomy`; move training-type
   validation to service level.
3. **Admin** — settings managers + nav/routes; switch `TrainingTypeForm` and admin
   badges to the dynamic lists.
4. **Mini-app** — taxonomy fetch + dynamic badges/filter; drop hardcoded maps.
5. **Cleanup** — remove dead enums/labels from `@fitcalendar/shared`.

## Testing

- Migration integration test: tables exist, seeded rows match the old constants.
- Service specs: CRUD, reorder swaps order, delete blocked when referenced (409),
  training-type create/update rejects unknown/inactive keys.
- Admin/mini-app: light component coverage for dynamic label/colour rendering and
  the unknown-key fallback.

## Risks

- **Two apps + shared churn.** Mitigated by the staged sequence — the seed keeps
  behaviour identical until each app is switched over.
- **Validation regression** when moving `@IsIn` to the service — covered by specs.
- **Unknown key in mini-app** if a level is deleted while a cached class references
  it — neutral fallback style, no crash.
