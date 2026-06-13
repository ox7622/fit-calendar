# Admin Calendar — Inline Create + Drag-and-Drop Move

**Date:** 2026-06-14
**Status:** Approved (design)
**Area:** `apps/admin` — schedule calendar view

## Goal

Make the admin schedule **calendar** view directly actionable:

1. **Create** a class right from a day column (via a `+` button → modal with the
   existing form, recurrence included).
2. **Move** a class to another day by **drag-and-drop** (changes the date, keeps
   the time of day), with an always-on confirmation because moving notifies
   subscribers.

Both features live only in the **calendar** view of `DashboardPage`; the list
view is unchanged.

## Context (current state)

- `ScheduleCalendar.tsx` is a 7-column week grid, **day-level only** (no time
  axis). Each class is a read-only `<button>` that either navigates to
  `/schedule/:id` or toggles selection in `selectMode`.
- `DashboardPage.tsx` owns the data (`items`), `reloadToken`, `showToast`,
  `selectMode`/`selectedIds`, and the week range.
- `ScheduleForm.tsx` already supports single + recurring create: passing
  `onSubmitRecurring` reveals the "Повторять" block; omitting it keeps the form
  single-class.
- `adminScheduleApi.update(id, { startTime })` already performs a move. It is
  **not** a silent operation: on the server, a `startTime` change emits
  `SCHEDULE_CHANGED_EVENT` (notifies subscribed customers) and recomputes pending
  reminders. This is why move requires confirmation.
- Reusable `Modal` (`shared/components/Modal.tsx`) and `DatePicker` exist.
- No drag-and-drop library is installed (only `date-fns`).

## Decisions

| Question | Decision |
|---|---|
| Drag granularity | **Day-level only.** Drop into another day keeps the time of day, changes the date. Precise time stays editable by clicking the card (existing `/schedule/:id`). |
| DnD technology | **Native HTML5 drag-and-drop.** No new dependency. |
| Create entry point | **`+` button** in each day-column header → modal. |
| Create modal scope | **With recurrence** (reuse `ScheduleForm` with both `onSubmit` and `onSubmitRecurring`). |
| Move confirmation | **Always confirm** before saving a move. |

## Approaches considered

- **Native HTML5 DnD (chosen).** `draggable` cards + day-column drop zones.
  ~30 lines, zero packages. Sufficient because moves are coarse (column → column).
- **`@dnd-kit/core` (rejected).** Smooth animations and pointer/keyboard support,
  but adds a dependency and complexity not justified for day-level moves.

## Architecture

State and side-effects stay in `DashboardPage` (it already owns reload + toast).
`ScheduleCalendar` stays thin and gets two new callbacks. Two small focused
components handle the modals.

```
DashboardPage
 ├─ owns: items, reloadToken, showToast, selectMode, rangeStart
 ├─ renders ScheduleCalendar (calendar view)
 │    new props:
 │      onRequestMove(item, newStartTime)   // opens MoveClassConfirm
 │      onCreateForDay(day: Date)           // opens CreateClassDialog
 ├─ MoveClassConfirm   (confirm → adminScheduleApi.update → reload + toast)
 └─ CreateClassDialog  (Modal + ScheduleForm → create/bulkCreate → reload + toast)
```

### ScheduleCalendar changes

New optional props (feature is additive; absent props = today's behavior):

```ts
interface IScheduleCalendarProps {
    // ...existing...
    onRequestMove?: (item: IAdminScheduleItem, newStartTime: string) => void;
    onCreateForDay?: (day: Date) => void;
}
```

- **Drag source:** each non-cancelled class card gets `draggable` (only when
  `!selectMode` and `onRequestMove` is provided). `onDragStart` stores the
  dragged item id via `dataTransfer` (and a ref for the item object).
- **Drop target:** each day column is a drop zone (`onDragOver` preventDefault to
  allow drop; light highlight while a drag is over it). `onDrop`:
  - resolve the dragged item;
  - compute `newStartTime` = the item's existing time-of-day applied to the drop
    day's date, serialized ISO;
  - if the day equals the item's current day → **no-op** (ignore);
  - else call `onRequestMove(item, newStartTime)`.
- **Create affordance:** day-column header shows a `+` button. To avoid clutter
  it is shown on hover/focus of the column (always visible is acceptable too).
  Hidden in `selectMode`. Click → `onCreateForDay(day)`.
- Drag is disabled while `selectMode` is on (there click = select-for-delete).

#### Time-of-day → new date helper

A pure helper keeps the date math testable:

```ts
// move-to-day.ts
/** Apply `target` day's calendar date to `iso`'s time-of-day; return ISO. */
export function moveToDay(iso: string, target: Date): string;
```

It must preserve hours/minutes from the original local time and only swap
year/month/day, then `toISOString()`. Unit-tested independently.

### MoveClassConfirm

Small component rendered by `DashboardPage` when a move is requested.

- Props: `item`, `newStartTime`, `onConfirm`, `onCancel`.
- Renders a `Modal` titled "Перенести занятие".
- Body: e.g. *«Перенести "Йога" с пн, 15 июня 09:00 на вт, 16 июня 09:00?
  Записанные клиенты получат уведомление.»*
- Confirm → `adminScheduleApi.update(item.id, { startTime: newStartTime })`,
  then close + `reloadToken++` + toast «Занятие перенесено». On error → toast
  «Не удалось перенести занятие» and keep dialog open / closeable.
- Reuses the existing `ApiError` message-extraction pattern from `ScheduleNewPage`.

### CreateClassDialog

- Props: `day: Date`, `onClose`, `onCreated(count)`.
- Renders a `Modal` titled "Новое занятие" containing `ScheduleForm` with:
  - `initial={{ startTime: <day at 09:00 local, datetime-local string base> }}`
    — prefill the date to the clicked day, default time 09:00, default duration 60.
  - `submitLabel="Создать"`.
  - `onSubmit` → `adminScheduleApi.create(payload)` → `onCreated(1)` + close.
  - `onSubmitRecurring` → `adminScheduleApi.bulkCreate(entries)` →
    `onCreated(entries.length)` + close.
  - `onCancel` → `onClose`.
- `onCreated` in `DashboardPage` already exists (`reloadToken++` + toast
  «Создано занятий: N»).

Note: `ScheduleForm` currently derives its `startTime` state from
`initial?.startTime` expecting an ISO string (it runs `isoToLocal`). Passing the
chosen day at 09:00 as ISO is consistent with that path — no form change needed.

## Data flow

**Create:** `+` → `onCreateForDay(day)` → `DashboardPage` sets
`createDay` state → renders `CreateClassDialog` → form submit → API → `onCreated`
→ reload + toast → dialog closes.

**Move:** dragstart on card → drop on a different day column →
`onRequestMove(item, newStartTime)` → `DashboardPage` sets `pendingMove` →
renders `MoveClassConfirm` → confirm → `update` → reload + toast → dialog closes.

## Error handling

- API failures surface as a toast; the calendar reloads from server truth on
  success only, so a failed move/create leaves the board unchanged.
- `moveToDay` never throws on the happy path; non-finite/parse issues are guarded
  by the drop handler (ignore drop if item can't be resolved).
- Dropping onto the same day is a no-op (no dialog, no request).

## Testing

- **Unit:** `moveToDay` — preserves time-of-day across DST-free day swaps;
  same-day input returns equivalent instant; handles month/year boundaries.
- **Component (if harness present for admin):**
  - card is `draggable` only when not in `selectMode`;
  - dropping on a different day calls `onRequestMove` with correct new ISO;
  - dropping on the same day does nothing;
  - cancelled cards are not draggable;
  - `+` calls `onCreateForDay` with the column's date; hidden in `selectMode`.
- **Manual:** create (single + recurring) from a day column; drag a class with
  subscribers → confirm copy mentions notification; verify subscribers/reminders
  behavior is the existing server path (unchanged).

## Out of scope (YAGNI)

- Time-of-day precision via drag (no time grid). Time stays click-to-edit.
- Resizing classes to change duration.
- Multi-select drag.
- Touch-drag polish beyond what native DnD gives.
```
