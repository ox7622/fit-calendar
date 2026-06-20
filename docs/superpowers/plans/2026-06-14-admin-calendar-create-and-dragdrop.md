# Admin Calendar — Inline Create + Drag-and-Drop Move Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins create classes from a calendar day column (modal, with recurrence) and move classes between days by native drag-and-drop, with an always-on confirm because a move notifies subscribers.

**Architecture:** Keep state/side-effects in `DashboardPage` (it already owns `reloadToken` + `showToast`). `ScheduleCalendar` stays thin, gaining two callbacks (`onRequestMove`, `onCreateForDay`). A pure `moveToDay` helper does the date math (unit-tested). Two small components — `CreateClassDialog` (Modal + existing `ScheduleForm`) and `MoveClassConfirm` (Modal + `update`) — handle the modals. Drag-and-drop is native HTML5 (no new dependency).

**Tech Stack:** React 19, TypeScript, Vite, `date-fns`, Vitest. Reuses existing `Modal`, `ScheduleForm`, `adminScheduleApi`.

> **Environment:** nx/vitest require Node 22 — run `nvm use 22.13.1` before any `pnpm nx` command (see project memory). Commit with the pre-commit hook (no `--no-verify`); stage by explicit path.

---

## File Structure

- **Create:** `apps/admin/src/features/schedule/move-to-day.ts` — pure date helper.
- **Create:** `apps/admin/src/features/schedule/move-to-day.spec.ts` — its unit tests.
- **Create:** `apps/admin/src/features/schedule/CreateClassDialog.tsx` — `+` create modal (reuses `ScheduleForm`, with recurrence).
- **Create:** `apps/admin/src/features/schedule/MoveClassConfirm.tsx` — move confirmation modal (`update`).
- **Modify:** `apps/admin/src/features/schedule/ScheduleCalendar.tsx` — add `draggable` cards, day drop zones, `+` button; new optional props.
- **Modify:** `apps/admin/src/pages/DashboardPage.tsx` — own create/move state, render the two dialogs, pass callbacks.

All feature props on `ScheduleCalendar` are optional — when absent, the component behaves exactly as today (e.g. its use is calendar-view-only).

---

### Task 1: `moveToDay` pure helper

**Files:**
- Create: `apps/admin/src/features/schedule/move-to-day.ts`
- Test: `apps/admin/src/features/schedule/move-to-day.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/admin/src/features/schedule/move-to-day.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { moveToDay } from './move-to-day';

/**
 * moveToDay keeps the local time-of-day of `iso` and swaps only the calendar
 * date to `target`'s date. We assert on the local wall-clock parts of the
 * result (not the raw ISO string) so the test is timezone-independent.
 */
function localParts(iso: string) {
    const d = new Date(iso);
    return {
        y: d.getFullYear(),
        m: d.getMonth(),
        day: d.getDate(),
        h: d.getHours(),
        min: d.getMinutes(),
    };
}

describe('moveToDay', () => {
    it('swaps the date but keeps the time of day', () => {
        const source = new Date(2026, 5, 15, 9, 30, 0, 0).toISOString(); // Mon 15 Jun 09:30 local
        const target = new Date(2026, 5, 17, 0, 0, 0, 0); // Wed 17 Jun
        const result = localParts(moveToDay(source, target));
        expect(result).toEqual({ y: 2026, m: 5, day: 17, h: 9, min: 30 });
    });

    it('returns the same instant when target is the same day', () => {
        const source = new Date(2026, 5, 15, 9, 30).toISOString();
        const target = new Date(2026, 5, 15, 0, 0);
        expect(moveToDay(source, target)).toBe(source);
    });

    it('handles month/year boundaries', () => {
        const source = new Date(2026, 11, 31, 18, 0).toISOString(); // 31 Dec 18:00
        const target = new Date(2027, 0, 1, 0, 0); // 1 Jan 2027
        const result = localParts(moveToDay(source, target));
        expect(result).toEqual({ y: 2027, m: 0, day: 1, h: 18, min: 0 });
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
nvm use 22.13.1 && pnpm nx test admin -- run move-to-day
```

Expected: FAIL — cannot resolve `./move-to-day` (module not found).

- [ ] **Step 3: Write the minimal implementation**

Create `apps/admin/src/features/schedule/move-to-day.ts`:

```ts
/**
 * Apply `target`'s calendar date (year/month/day) to `iso`, preserving its
 * local time-of-day, and return the result as an ISO string. `setFullYear`
 * operates in local time, so the wall-clock hour/minute are unchanged across
 * the swap. Used by the calendar's drag-and-drop move (day-level only).
 */
export function moveToDay(iso: string, target: Date): string {
    const result = new Date(iso);
    result.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
    return result.toISOString();
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
nvm use 22.13.1 && pnpm nx test admin -- run move-to-day
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/move-to-day.ts apps/admin/src/features/schedule/move-to-day.spec.ts
git commit -m "feat(admin): moveToDay helper for calendar drag-and-drop"
```

---

### Task 2: `CreateClassDialog` component

Reuses `ScheduleForm` (with recurrence) inside the existing `Modal`. Prefills the date to the clicked day at 09:00 local. Mirrors the create/bulkCreate + `ApiError` handling already in `ScheduleNewPage.tsx`.

**Files:**
- Create: `apps/admin/src/features/schedule/CreateClassDialog.tsx`

- [ ] **Step 1: Write the component**

Create `apps/admin/src/features/schedule/CreateClassDialog.tsx`:

```tsx
import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, ApiError } from '@/shared/api';
import { Modal } from '@/shared/components/Modal';

interface ICreateClassDialogProps {
    /** The day column the admin clicked "+" on. Prefills the form's date. */
    day: Date;
    onClose: () => void;
    /** Called after a successful create; `count` is 1 for single, N for recurring. */
    onCreated: (count: number) => void;
}

/** The form prefills its date from an ISO string; default the time to 09:00 local. */
function dayAtNineISO(day: Date): string {
    const base = new Date(day);
    base.setHours(9, 0, 0, 0);
    return base.toISOString();
}

function apiErrorMessage(err: unknown, fallback: string): Error {
    if (err instanceof ApiError) {
        const body = err.data as { message?: string } | null;
        return new Error(body?.message ?? fallback);
    }
    return err instanceof Error ? err : new Error(fallback);
}

export function CreateClassDialog({ day, onClose, onCreated }: ICreateClassDialogProps): JSX.Element {
    return (
        <Modal title="Новое занятие" onClose={onClose} panelClassName="max-h-[90vh] overflow-y-auto">
            <ScheduleForm
                initial={{ startTime: dayAtNineISO(day) }}
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    try {
                        await adminScheduleApi.create(payload);
                        onCreated(1);
                        onClose();
                    } catch (err) {
                        throw apiErrorMessage(err, 'Не удалось создать занятие');
                    }
                }}
                onSubmitRecurring={async (entries) => {
                    try {
                        await adminScheduleApi.bulkCreate(entries);
                        onCreated(entries.length);
                        onClose();
                    } catch (err) {
                        throw apiErrorMessage(err, 'Не удалось создать занятия');
                    }
                }}
                onCancel={onClose}
            />
        </Modal>
    );
}
```

- [ ] **Step 2: Typecheck the new file**

```bash
nvm use 22.13.1 && pnpm nx typecheck admin
```

Expected: PASS — no type errors. (The component isn't rendered yet; this just confirms the file compiles against `ScheduleForm`/`Modal`/api types.)

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/CreateClassDialog.tsx
git commit -m "feat(admin): CreateClassDialog (calendar inline create modal)"
```

---

### Task 3: `MoveClassConfirm` component

Confirms a drag-move before calling `update`. The confirm copy names the class and both times and warns that subscribers are notified.

**Files:**
- Create: `apps/admin/src/features/schedule/MoveClassConfirm.tsx`

- [ ] **Step 1: Write the component**

Create `apps/admin/src/features/schedule/MoveClassConfirm.tsx`:

```tsx
import { useState } from 'react';

import { adminScheduleApi, ApiError, type IAdminScheduleItem } from '@/shared/api';
import { Modal } from '@/shared/components/Modal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IMoveClassConfirmProps {
    item: IAdminScheduleItem;
    /** New ISO start time (date swapped, time-of-day preserved). */
    newStartTime: string;
    /** Called after a successful move so the page can reload + toast. */
    onMoved: () => void;
    onClose: () => void;
}

function fmt(iso: string): string {
    return format(parseISO(iso), 'EEE d MMM, HH:mm', { locale: ru });
}

export function MoveClassConfirm({ item, newStartTime, onMoved, onClose }: IMoveClassConfirmProps): JSX.Element {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async (): Promise<void> => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await adminScheduleApi.update(item.id, { startTime: newStartTime });
            onMoved();
            onClose();
        } catch (err) {
            const fallback = 'Не удалось перенести занятие';
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? fallback);
            } else {
                setError(fallback);
            }
            setSubmitting(false);
        }
    };

    return (
        <Modal title="Перенести занятие" onClose={onClose}>
            <p className="text-body mb-4">
                Перенести «{item.trainingType.name}» с <strong>{fmt(item.startTime)}</strong> на{' '}
                <strong>{fmt(newStartTime)}</strong>?
            </p>
            <p className="text-body-secondary mb-4 text-sm">Записанные клиенты получат уведомление.</p>
            {error && (
                <p role="alert" className="text-destructive mb-3 text-sm">
                    {error}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-md border border-border px-4 py-2 hover:bg-muted disabled:opacity-60"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent-active disabled:opacity-60"
                >
                    {submitting ? 'Перенос...' : 'Перенести'}
                </button>
            </div>
        </Modal>
    );
}
```

- [ ] **Step 2: Typecheck the new file**

```bash
nvm use 22.13.1 && pnpm nx typecheck admin
```

Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/MoveClassConfirm.tsx
git commit -m "feat(admin): MoveClassConfirm dialog for calendar drag-move"
```

---

### Task 4: Drag-and-drop + `+` button in `ScheduleCalendar`

Add two optional props and the DnD/create affordances. Cards become draggable (not in `selectMode`, not when cancelled); day columns become drop zones; a hover-revealed `+` sits in each day header.

**Files:**
- Modify: `apps/admin/src/features/schedule/ScheduleCalendar.tsx`

- [ ] **Step 1: Add imports and props**

In `apps/admin/src/features/schedule/ScheduleCalendar.tsx`, add `useState` to the React import and `moveToDay` to the local imports:

```tsx
import { useMemo, useState } from 'react';
```

```tsx
import { moveToDay } from './move-to-day';
```

Extend the props interface (add the two optional callbacks):

```tsx
interface IScheduleCalendarProps {
    items: IAdminScheduleItem[];
    rangeStart: Date;
    /** When true, clicking a class toggles selection instead of opening it. */
    selectMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
    /** Drag a class to another day → request a move (date swapped, time kept). */
    onRequestMove?: (item: IAdminScheduleItem, newStartTime: string) => void;
    /** Click the "+" in a day header → create a class for that day. */
    onCreateForDay?: (day: Date) => void;
}
```

- [ ] **Step 2: Add drag state and destructure the new props**

Update the function signature destructuring and add local drag state at the top of the component body:

```tsx
export function ScheduleCalendar({
    items,
    rangeStart,
    selectMode = false,
    selectedIds,
    onToggleSelect,
    onRequestMove,
    onCreateForDay,
}: IScheduleCalendarProps): JSX.Element {
    const navigate = useNavigate();
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(rangeStart, i));
    const overlappingIds = useMemo(() => findOverlappingIds(items), [items]);

    const dragEnabled = !selectMode && onRequestMove !== undefined;

    const handleDrop = (day: Date): void => {
        setDragOverKey(null);
        const id = draggingId;
        setDraggingId(null);
        if (id === null || !onRequestMove) return;
        const item = items.find((i) => i.id === id);
        if (!item) return;
        if (isSameDay(parseISO(item.startTime), day)) return; // same day → no-op
        onRequestMove(item, moveToDay(item.startTime, day));
    };
```

- [ ] **Step 3: Make the day column a drop zone with a "+" header button**

Replace the day-column wrapper and header block. Find the existing return-of-`days.map` opening (the `<div key={key} className="flex flex-col gap-1">` and the header `<div>` inside it) and replace through the header so it reads:

```tsx
                return (
                    <div
                        key={key}
                        className={`group flex flex-col gap-1 rounded-lg ${
                            dragOverKey === key && dragEnabled ? 'bg-primary/5 ring-2 ring-primary/40' : ''
                        }`}
                        onDragOver={(e) => {
                            if (!dragEnabled) return;
                            e.preventDefault();
                            if (dragOverKey !== key) setDragOverKey(key);
                        }}
                        onDragLeave={(e) => {
                            // Only clear when truly leaving the column, not when moving onto a child.
                            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                                setDragOverKey((prev) => (prev === key ? null : prev));
                            }
                        }}
                        onDrop={(e) => {
                            if (!dragEnabled) return;
                            e.preventDefault();
                            handleDrop(day);
                        }}
                    >
                        <div
                            className={`flex items-center justify-center gap-1 pb-2 text-xs font-semibold uppercase tracking-wide ${
                                isToday ? 'text-primary' : 'text-muted-foreground'
                            }`}
                        >
                            <div className="text-center">
                                <div>{format(day, 'EEE', { locale: ru })}</div>
                                <div className={isToday ? 'text-primary font-bold' : 'text-foreground/70'}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                            {onCreateForDay && !selectMode && (
                                <button
                                    type="button"
                                    onClick={() => onCreateForDay(day)}
                                    aria-label={`Добавить занятие на ${format(day, 'd MMMM', { locale: ru })}`}
                                    title="Добавить занятие"
                                    className="ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-md border border-border text-muted-foreground opacity-0 transition-opacity hover:bg-muted focus:opacity-100 group-hover:opacity-100"
                                >
                                    +
                                </button>
                            )}
                        </div>
```

(The `<div className="flex-1 space-y-1 ...">` body and everything after it stay as-is, and the existing closing `</div>` for the column wrapper is unchanged.)

- [ ] **Step 4: Make the class card draggable**

On the existing class `<button>` (the one keyed by `item.id`), add drag attributes. Insert these props alongside the existing `key`/`type`/`onClick` (a cancelled or select-mode card is not draggable):

```tsx
                                            draggable={dragEnabled && !isCancelled}
                                            onDragStart={(e) => {
                                                if (!dragEnabled || isCancelled) return;
                                                setDraggingId(item.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                                e.dataTransfer.setData('text/plain', item.id);
                                            }}
                                            onDragEnd={() => {
                                                setDraggingId(null);
                                                setDragOverKey(null);
                                            }}
```

Also append a dragging opacity to the card. In the card's `className` template literal, add ` ${draggingId === item.id ? 'opacity-40' : ''}` at the very end (before the closing backtick), and add ` cursor-grab` after the base classes when draggable is desired — to keep it simple, append ` ${dragEnabled && !isCancelled ? 'cursor-grab active:cursor-grabbing' : ''}` to the same className.

- [ ] **Step 5: Typecheck**

```bash
nvm use 22.13.1 && pnpm nx typecheck admin
```

Expected: PASS — no type errors.

- [ ] **Step 6: Build to confirm no JSX/structural errors**

```bash
nvm use 22.13.1 && pnpm nx build admin
```

Expected: PASS — build succeeds. (Catches any mismatched JSX tags from the header replacement.)

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/schedule/ScheduleCalendar.tsx
git commit -m "feat(admin): drag-to-move + per-day create button in ScheduleCalendar"
```

---

### Task 5: Wire dialogs into `DashboardPage`

Add `createDay` and `pendingMove` state, pass the two callbacks to `ScheduleCalendar`, and render the dialogs. Reuse the existing `onCreated` (reload + toast) and add a small move-completion handler.

**Files:**
- Modify: `apps/admin/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add imports**

Add the two new component imports near the existing schedule imports at the top of `DashboardPage.tsx`:

```tsx
import { CreateClassDialog } from '@/features/schedule/CreateClassDialog';
import { MoveClassConfirm } from '@/features/schedule/MoveClassConfirm';
```

- [ ] **Step 2: Add state**

After the existing `useState` declarations in `DashboardPage` (e.g. after `bulkBusy`), add:

```tsx
    const [createDay, setCreateDay] = useState<Date | null>(null);
    const [pendingMove, setPendingMove] = useState<{ item: IAdminScheduleItem; newStartTime: string } | null>(null);
```

- [ ] **Step 3: Add the move-completion handler**

Next to the existing `onCreated` handler, add:

```tsx
    const onMoved = (): void => {
        setReloadToken((t) => t + 1);
        showToast('Занятие перенесено');
    };
```

- [ ] **Step 4: Pass callbacks to the calendar**

Update the `<ScheduleCalendar ... />` render (in the `view === 'calendar'` branch) to pass the two new props:

```tsx
                <ScheduleCalendar
                    items={items}
                    rangeStart={rangeStart}
                    selectMode={selectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onRequestMove={(item, newStartTime) => setPendingMove({ item, newStartTime })}
                    onCreateForDay={(day) => setCreateDay(day)}
                />
```

- [ ] **Step 5: Render the dialogs**

Just before the closing `{toast && (...)}` block (near the bottom of the returned JSX), add:

```tsx
            {createDay && (
                <CreateClassDialog
                    day={createDay}
                    onClose={() => setCreateDay(null)}
                    onCreated={onCreated}
                />
            )}
            {pendingMove && (
                <MoveClassConfirm
                    item={pendingMove.item}
                    newStartTime={pendingMove.newStartTime}
                    onMoved={onMoved}
                    onClose={() => setPendingMove(null)}
                />
            )}
```

- [ ] **Step 6: Typecheck and build**

```bash
nvm use 22.13.1 && pnpm nx typecheck admin && pnpm nx build admin
```

Expected: PASS — both succeed.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/pages/DashboardPage.tsx
git commit -m "feat(admin): wire create + drag-move dialogs into calendar view"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the admin unit tests and typecheck**

```bash
nvm use 22.13.1 && pnpm nx test admin && pnpm nx typecheck admin
```

Expected: PASS — all tests green (including the 3 `moveToDay` tests), no type errors.

- [ ] **Step 2: Manual smoke test**

Start the admin app (per the repo's local-dev docs / README "Testing Locally") and, in the **calendar** view:

1. Hover a day column → the `+` appears in the header → click it → the "Новое занятие" modal opens with the date prefilled to that day.
2. Create a single class → toast «Создано занятий: 1», board reloads with the new class.
3. Re-open `+`, tick «Повторять», pick weekdays + range → submit → toast shows the recurring count, classes appear across the week(s).
4. Drag a scheduled class onto another day → the "Перенести занятие" confirm shows the old + new date/time and the subscriber-notification warning.
   - Confirm → toast «Занятие перенесено», the card moves to the new day with the same time.
   - Cancel → nothing changes.
5. Drag a class onto its own day → nothing happens (no dialog).
6. Enter «Выбрать» (select mode) → cards are no longer draggable and the `+` is hidden.
7. Cancelled classes cannot be dragged.

- [ ] **Step 3: Final confirmation**

Confirm the git log shows the six feature commits and the working tree is clean:

```bash
git status && git log --oneline -7
```

Expected: clean tree; commits for moveToDay, CreateClassDialog, MoveClassConfirm, ScheduleCalendar DnD, DashboardPage wiring (plus the earlier design-doc commit).

---

## Self-Review notes

- **Spec coverage:** day-level drag (Task 1 + 4), DnD = native HTML5 (Task 4), `+` create entry (Task 4 button + Task 2 modal), recurrence in modal (Task 2 passes `onSubmitRecurring`), always-confirm move (Task 3), notification warning copy (Task 3), state in `DashboardPage` (Task 5), thin `ScheduleCalendar` with `onRequestMove`/`onCreateForDay` (Task 4), `moveToDay` unit-tested (Task 1), same-day no-op + cancelled-not-draggable + select-mode disables drag (Task 4), error→toast/inline (Tasks 2/3). Out-of-scope items (time grid, resize, multi-select drag) are intentionally absent.
- **Type consistency:** `onRequestMove(item: IAdminScheduleItem, newStartTime: string)` and `onCreateForDay(day: Date)` are used identically in Tasks 4 and 5; `onCreated(count: number)` matches the existing `DashboardPage` handler; `update(id, { startTime })` matches `adminScheduleApi`.
- **No placeholders:** every code step shows full code; commands include expected output.
