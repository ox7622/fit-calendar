# Per-action "don't notify" toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin suppress the user-facing push for any single schedule create/edit/cancel/delete via a "notify users" checkbox (default on) in the in-window confirmation.

**Architecture:** A `notify` flag (default `true`) is threaded through each admin schedule endpoint; `AdminScheduleService` emits the broadcast event only when `notify !== false`. The server stays authoritative — a push fires only when `notify === true` AND the class is in the 5-day window (gate already lives in the listener). Reminder/cancel side-effects are untouched.

**Tech Stack:** NestJS + class-validator/class-transformer + Jest (API), React + Vite + vitest (admin), Nx (Node 22 — `nvm use 22.13.1`).

**Spec:** `docs/superpowers/specs/2026-06-20-notification-suppress-toggle-design.md`

**Pre-req for every command:** `source ~/.nvm/nvm.sh && nvm use 22.13.1`.

---

## Phase A — Backend

### Task 1: DTOs — add `notify` flag + delete query DTO

**Files:**
- Modify: `apps/api/src/modules/admin/schedule/dto/create-schedule-entry.dto.ts`
- Modify: `apps/api/src/modules/admin/schedule/dto/cancel-class.dto.ts`
- Create: `apps/api/src/modules/admin/schedule/dto/delete-schedule-entry-query.dto.ts`
- Modify: `apps/api/src/modules/admin/schedule/index.ts` (export the new DTO if the barrel exports the others)
- Test: `apps/api/src/modules/admin/schedule/__tests__/delete-schedule-entry-query.dto.spec.ts`

> `UpdateScheduleEntryDto extends PartialType(CreateScheduleEntryDto)`, so adding `notify` to the create DTO automatically gives the update DTO an optional `notify` too. `BulkCreateScheduleDto` reuses `CreateScheduleEntryDto` for its entries; `bulkCreate` ignores `notify` (bulk stays silent) — harmless.

- [ ] **Step 1: Write the failing test for the delete query DTO**

```ts
// apps/api/src/modules/admin/schedule/__tests__/delete-schedule-entry-query.dto.spec.ts
import { plainToInstance } from 'class-transformer';

import { DeleteScheduleEntryQueryDto } from '../dto/delete-schedule-entry-query.dto';

describe('DeleteScheduleEntryQueryDto', () => {
    it('coerces the string "false" to boolean false', () => {
        const dto = plainToInstance(DeleteScheduleEntryQueryDto, { notify: 'false' });
        expect(dto.notify).toBe(false);
    });

    it('treats the string "true" as true', () => {
        expect(plainToInstance(DeleteScheduleEntryQueryDto, { notify: 'true' }).notify).toBe(true);
    });

    it('defaults to true when the param is absent', () => {
        expect(plainToInstance(DeleteScheduleEntryQueryDto, {}).notify).toBe(true);
    });
});
```

- [ ] **Step 2: Run it, verify it FAILS**

Run: `npx nx test api --testFile=delete-schedule-entry-query`
Expected: FAIL — cannot find module `../dto/delete-schedule-entry-query.dto`.

- [ ] **Step 3: Create the delete query DTO**

```ts
// apps/api/src/modules/admin/schedule/dto/delete-schedule-entry-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Query for DELETE /admin/schedule/:id. `notify=false` deletes without pushing
 * to users. Query values arrive as strings, so coerce explicitly — implicit
 * boolean conversion would turn the non-empty string "false" into `true`.
 */
export class DeleteScheduleEntryQueryDto {
    @ApiPropertyOptional({ description: 'Set false to delete without notifying users. Default true.' })
    @IsOptional()
    @Transform(({ value }) => value !== 'false' && value !== false)
    @IsBoolean()
    notify?: boolean = true;
}
```

- [ ] **Step 4: Add `notify` to `CreateScheduleEntryDto`**

In `create-schedule-entry.dto.ts`, update the imports and append the field:

```ts
// add ApiPropertyOptional to the existing @nestjs/swagger import,
// and IsBoolean + IsOptional to the existing class-validator import
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
```

Append inside the class (after `durationMinutes`):

```ts
    @ApiPropertyOptional({
        description: 'When false, save the change without pushing a notification to users. Default true.',
    })
    @IsOptional()
    @IsBoolean()
    notify?: boolean;
```

- [ ] **Step 5: Add `notify` to `CancelClassDto`**

In `cancel-class.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassDto {
    @ApiPropertyOptional({
        description:
            'Optional free-text cancellation reason (max 500 chars). Surfaced to subscribers in the notification.',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;

    @ApiPropertyOptional({
        description: 'When false, cancel without pushing a notification to users. Default true.',
    })
    @IsOptional()
    @IsBoolean()
    notify?: boolean;
}
```

- [ ] **Step 6: Export the new DTO from the barrel (if present)**

Check `apps/api/src/modules/admin/schedule/index.ts`. If it has `export * from './dto/cancel-class.dto';`-style lines, add:

```ts
export * from './dto/delete-schedule-entry-query.dto';
```

- [ ] **Step 7: Run the DTO test + build**

Run: `npx nx test api --testFile=delete-schedule-entry-query` → PASS (3 tests).
Run: `npx nx build api` → succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/admin/schedule/dto/ apps/api/src/modules/admin/schedule/index.ts apps/api/src/modules/admin/schedule/__tests__/delete-schedule-entry-query.dto.spec.ts
git commit -m "feat(api): add notify flag to schedule DTOs + delete query DTO"
```

---

### Task 2: Service + controller — gate the broadcast emit on `notify`

**Files:**
- Modify: `apps/api/src/modules/admin/schedule/admin-schedule.service.ts`
- Modify: `apps/api/src/modules/admin/schedule/admin-schedule.controller.ts`
- Test: `apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts`

- [ ] **Step 1: Write the failing tests (one suppression test per action)**

Add these tests to the existing describes in `admin-schedule.service.spec.ts`. They reuse each describe's existing mock setup (`scheduleRepo`, `eventEmitter`, `dataSource`, `buildEntry`, etc.).

In `describe('create ...')`:

```ts
        it('does NOT emit SCHEDULE_CREATED when notify=false', async () => {
            coachRepo.findOne.mockResolvedValueOnce({ id: 'c-1', isActive: true } as Coach);
            trainingTypeRepo.findOne.mockResolvedValueOnce({ id: 't-1', isActive: true } as TrainingType);
            scheduleRepo.save.mockResolvedValueOnce({
                ...createDto,
                id: 'sched-new',
                status: 'scheduled',
            } as ScheduleEntry);
            scheduleRepo.findOne.mockResolvedValueOnce(buildEntry({ id: 'sched-new' }));

            await service.create({ ...createDto, notify: false });

            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CREATED_EVENT, expect.anything());
        });
```

In `describe('update ...')`:

```ts
        it('does NOT emit SCHEDULE_CHANGED when notify=false (reminders still recompute)', async () => {
            const newStartTime = new Date('2026-05-15T11:00:00Z');
            await service.update('sched-edit', { startTime: newStartTime, notify: false });

            expect(reminderService.recomputeNotifyAtForClass).toHaveBeenCalledWith('sched-edit', newStartTime);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CHANGED_EVENT, expect.anything());
        });
```

In `describe('cancel ...')` (reuses that block's transaction mock setup — copy the arrange section from the existing happy-path cancel test, then):

```ts
        it('does NOT emit SCHEDULE_CANCELLED when notify=false', async () => {
            // (arrange identical to the happy-path cancel test in this describe)
            await service.cancel('sched-1', 'reason', undefined, false);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_CANCELLED_EVENT, expect.anything());
        });
```

In `describe('deleteEntry ...')`:

```ts
        it('does NOT emit SCHEDULE_DELETED when notify=false', async () => {
            const entry = buildEntry({ id: 'sched-x', reminders: [] } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);
            scheduleRepo.remove.mockResolvedValueOnce(entry);

            await service.deleteEntry('sched-x', undefined, false);

            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(SCHEDULE_DELETED_EVENT, expect.anything());
        });
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx nx test api --testFile=admin-schedule.service`
Expected: FAIL — `cancel`/`deleteEntry` don't accept a `notify` arg yet; create/update still emit.

- [ ] **Step 3: Gate `create()`**

In `create()`, wrap the emit:

```ts
        const notify = dto.notify ?? true;
        if (notify) {
            this.eventEmitter.emit(SCHEDULE_CREATED_EVENT, createdPayload);
        }
        return toAdminScheduleItem(item);
```

(Keep the `createdPayload` construction above it; only the emit becomes conditional.)

- [ ] **Step 4: Gate `update()`**

Change the emit guard to include `notify`:

```ts
        const notify = dto.notify ?? true;
        if (notify && (startTimeChanged || durationChanged)) {
            const payload: IScheduleChangedPayload = {
                // ...unchanged payload...
            };
            this.eventEmitter.emit(SCHEDULE_CHANGED_EVENT, payload);
        }
```

(The reminder recompute block stays as-is, above and independent of `notify`.)

- [ ] **Step 5: Gate `cancel()` — add a `notify` param**

Change the signature and the post-commit emit:

```ts
    async cancel(
        id: string,
        reason: string | null,
        audit?: IAuditContext,
        notify = true,
    ): Promise<AdminScheduleItemDto> {
```

Wrap only the broadcast emit (leave reminder deletion + audit unchanged):

```ts
        if (notify) {
            this.eventEmitter.emit(SCHEDULE_CANCELLED_EVENT, payload);
        }
```

- [ ] **Step 6: Gate `deleteEntry()` — add a `notify` param**

```ts
    async deleteEntry(id: string, audit?: IAuditContext, notify = true): Promise<void> {
```

Wrap the emit:

```ts
        if (notify) {
            this.eventEmitter.emit(SCHEDULE_DELETED_EVENT, deletedPayload);
        }
```

- [ ] **Step 7: Wire the controller**

In `admin-schedule.controller.ts`:

`cancel` — pass `dto.notify`:

```ts
        return this.scheduleService.cancel(id, dto.reason ?? null, { adminUserId, ipAddress }, dto.notify ?? true);
```

`deleteEntry` — accept the query DTO and pass `notify`. Add the import:

```ts
import { DeleteScheduleEntryQueryDto } from './dto/delete-schedule-entry-query.dto';
```

and update the handler signature/body (add `@Query()` — import `Query` from `@nestjs/common` if not already imported):

```ts
    async deleteEntry(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Query() query: DeleteScheduleEntryQueryDto,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.scheduleService.deleteEntry(id, { adminUserId, ipAddress }, query.notify ?? true);
    }
```

`create` and `update` need no controller change — the service reads `dto.notify` itself.

- [ ] **Step 8: Run tests + lint + build**

Run: `npx nx test api --testFile=admin-schedule.service` → PASS (all, including the 4 new suppression tests).
Run: `npx nx lint api` → clean.
Run: `npx nx build api` → succeeds.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/admin/schedule/admin-schedule.service.ts apps/api/src/modules/admin/schedule/admin-schedule.controller.ts apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts
git commit -m "feat(api): suppress schedule broadcast when notify=false"
```

---

## Phase B — Admin frontend

> Admin has no React component-test harness (only logic specs via vitest), so frontend tasks are verified with `nx build admin` + `nx lint admin` and the browser. Keep the logic in the pure `notify-window.ts` (already tested).

### Task 3: Admin API client — thread `notify` through

**Files:**
- Modify: `apps/admin/src/shared/api/schedule.api.ts`

- [ ] **Step 1: Update the four methods**

Replace the `create`, `update`, `cancel`, `delete` entries in `adminScheduleApi`:

```ts
    create: (payload: IScheduleFormPayload, notify = true): Promise<IAdminScheduleItem> =>
        adminApiClient.post<IAdminScheduleItem>('/admin/schedule', { ...payload, notify }),

    bulkCreate: (entries: IScheduleFormPayload[]): Promise<IBulkCreateResponse> =>
        adminApiClient.post<IBulkCreateResponse>('/admin/schedule/bulk', { entries }),

    update: (id: string, payload: Partial<IScheduleFormPayload>, notify = true): Promise<IAdminScheduleItem> =>
        adminApiClient.put<IAdminScheduleItem>(`/admin/schedule/${id}`, { ...payload, notify }),

    cancel: (id: string, reason: string | null, notify = true): Promise<IAdminScheduleItem> =>
        adminApiClient.post<IAdminScheduleItem>(`/admin/schedule/${id}/cancel`, {
            reason: reason ?? undefined,
            notify,
        }),

    delete: (id: string, notify = true): Promise<void> =>
        adminApiClient.delete<void>(`/admin/schedule/${id}`, notify ? undefined : { params: { notify: 'false' } }),
```

(`bulkCreate`/`bulkDelete` stay unchanged.)

- [ ] **Step 2: Build**

Run: `npx nx build admin` → succeeds (callers still pass old args; new params default to `true`, so this is non-breaking on its own).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/shared/api/schedule.api.ts
git commit -m "feat(admin): thread notify flag through schedule API client"
```

---

### Task 4: ConfirmDialog/useConfirm checkbox + create/edit/delete callers

**Files:**
- Modify: `apps/admin/src/shared/components/ConfirmDialog.tsx`
- Modify: `apps/admin/src/pages/ScheduleEditPage.tsx`
- Modify: `apps/admin/src/features/schedule/CreateClassDialog.tsx`

- [ ] **Step 1: Extend `ConfirmDialog` + `useConfirm`**

Replace the contents of `ConfirmDialog.tsx` with:

```tsx
import { useState, type ReactNode } from 'react';

import { Modal } from './Modal';

interface IConfirmDialogProps {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** Destructive styling for the confirm button (delete/cancel actions). */
    danger?: boolean;
    /** When set, render a checkbox (default checked) with this label; its value
     *  is returned to the caller as `notify`. */
    notifyLabel?: string;
    onConfirm: (notify: boolean) => void;
    onClose: () => void;
}

/** One-shot confirm modal built on the shared Modal. */
export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Продолжить',
    danger = false,
    notifyLabel,
    onConfirm,
    onClose,
}: IConfirmDialogProps): JSX.Element {
    const [notify, setNotify] = useState(true);
    return (
        <Modal title={title} onClose={onClose}>
            <div className="text-body mb-4">{message}</div>
            {notifyLabel && (
                <label className="text-body mb-4 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={notify}
                        onChange={(e) => setNotify(e.target.checked)}
                        className="h-4 w-4"
                    />
                    {notifyLabel}
                </label>
            )}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-border px-4 py-2 hover:bg-muted"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={() => onConfirm(notify)}
                    className={
                        danger
                            ? 'rounded-md bg-destructive px-4 py-2 font-medium text-white hover:opacity-90'
                            : 'rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent-active'
                    }
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

interface IConfirmRequest {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
    /** Show a "notify users" checkbox with this label. */
    notifyToggle?: { label: string };
}

export interface IConfirmResult {
    confirmed: boolean;
    /** Checkbox state; `true` when no toggle was shown or on cancel. */
    notify: boolean;
}

/**
 * Promise-based confirm. Usage:
 *   const { confirm, dialog } = useConfirm();
 *   const { confirmed, notify } = await confirm({ title, message });
 *   if (!confirmed) return;
 *   ...render {dialog} once in the component tree.
 */
export function useConfirm(): {
    confirm: (req: IConfirmRequest) => Promise<IConfirmResult>;
    dialog: JSX.Element | null;
} {
    const [state, setState] = useState<{ req: IConfirmRequest; resolve: (r: IConfirmResult) => void } | null>(null);

    const confirm = (req: IConfirmRequest): Promise<IConfirmResult> =>
        new Promise<IConfirmResult>((resolve) => setState({ req, resolve }));

    const settle = (result: IConfirmResult): void => {
        state?.resolve(result);
        setState(null);
    };

    const dialog = state ? (
        <ConfirmDialog
            title={state.req.title}
            message={state.req.message}
            confirmLabel={state.req.confirmLabel}
            danger={state.req.danger}
            notifyLabel={state.req.notifyToggle?.label}
            onConfirm={(notify) => settle({ confirmed: true, notify })}
            onClose={() => settle({ confirmed: false, notify: true })}
        />
    ) : null;

    return { confirm, dialog };
}
```

- [ ] **Step 2: Update the delete + edit handlers in `ScheduleEditPage.tsx`**

`handleDelete` — use the new result shape, add the toggle when in window, pass `notify` to the API:

```tsx
    const handleDelete = async () => {
        if (!id || !entry) return;
        const willPush = isWithinNotifyWindow(entry.startTime);
        const prefix = willPush ? `${PUSH_WARNING} ` : '';
        const { confirmed, notify } = await confirm({
            title: 'Удалить занятие?',
            message: `${prefix}Занятие будет удалено безвозвратно. Продолжить?`,
            confirmLabel: 'Удалить',
            danger: true,
            notifyToggle: willPush ? { label: 'Уведомить пользователей' } : undefined,
        });
        if (!confirmed) return;
        setDeleteError(null);
        try {
            await adminScheduleApi.delete(id, notify);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setDeleteError(body?.message ?? 'Не удалось удалить занятие');
                return;
            }
            setDeleteError('Не удалось удалить занятие');
        }
    };
```

Edit-save `onSubmit` — capture `notify`, pass to `update`:

```tsx
                onSubmit={async (payload) => {
                    if (!id) return;
                    let notify = true;
                    if (isWithinNotifyWindow(payload.startTime)) {
                        const res = await confirm({
                            title: 'Сохранить изменения?',
                            message: `${PUSH_WARNING} Продолжить?`,
                            confirmLabel: 'Сохранить',
                            notifyToggle: { label: 'Уведомить пользователей' },
                        });
                        if (!res.confirmed) return;
                        notify = res.notify;
                    }
                    try {
                        await adminScheduleApi.update(id, payload, notify);
                        navigate('/dashboard', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось сохранить занятие');
                        }
                        throw err;
                    }
                }}
```

- [ ] **Step 3: Update the create handler in `CreateClassDialog.tsx`**

```tsx
                onSubmit={async (payload) => {
                    let notify = true;
                    if (isWithinNotifyWindow(payload.startTime)) {
                        const res = await confirm({
                            title: 'Создать занятие?',
                            message: `${PUSH_WARNING} Продолжить?`,
                            confirmLabel: 'Создать',
                            notifyToggle: { label: 'Уведомить пользователей' },
                        });
                        if (!res.confirmed) return;
                        notify = res.notify;
                    }
                    try {
                        await adminScheduleApi.create(payload, notify);
                        onCreated(1);
                        onClose();
                    } catch (err) {
                        throw new Error(extractApiMessage(err, 'Не удалось создать занятие'));
                    }
                }}
```

- [ ] **Step 4: Build + lint**

Run: `npx nx build admin` → succeeds.
Run: `npx nx lint admin` → clean (no other `useConfirm` callers exist beyond these two files — verify with `grep -rn "useConfirm" apps/admin/src`).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/shared/components/ConfirmDialog.tsx apps/admin/src/pages/ScheduleEditPage.tsx apps/admin/src/features/schedule/CreateClassDialog.tsx
git commit -m "feat(admin): notify-users checkbox in create/edit/delete confirms"
```

---

### Task 5: Cancel + move modals — checkbox + wiring

**Files:**
- Modify: `apps/admin/src/features/schedule/CancelClassModal.tsx`
- Modify: `apps/admin/src/pages/ScheduleEditPage.tsx` (cancel `onConfirm` passes `notify`)
- Modify: `apps/admin/src/features/schedule/MoveClassConfirm.tsx`

- [ ] **Step 1: `CancelClassModal` — add the checkbox and pass `notify` up**

Change `onConfirm` to carry `notify`, add a `notify` state, and render the checkbox when `willPush`.

Update the props interface + signature:

```tsx
interface ICancelClassModalProps {
    className: string;
    startTimeLabel: string;
    affectedReminderHint?: string;
    /** When true, show that cancelling pushes all bot users (class within 5 days). */
    willPush?: boolean;
    onConfirm: (reason: string | null, notify: boolean) => Promise<void>;
    onClose: () => void;
}
```

Add state near the other `useState`s:

```tsx
    const [notify, setNotify] = useState(true);
```

In `handleConfirm`, pass `notify`:

```tsx
            await onConfirm(trimmed.length === 0 ? null : trimmed, notify);
```

Render the checkbox right after the existing `willPush` warning block:

```tsx
                {willPush && (
                    <label className="text-body mb-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            className="h-4 w-4"
                        />
                        Уведомить пользователей
                    </label>
                )}
```

- [ ] **Step 2: `ScheduleEditPage` — forward `notify` from the cancel modal**

Update the `<CancelClassModal onConfirm={...}>` handler signature:

```tsx
                    onConfirm={async (reason, notify) => {
                        if (!id) return;
                        try {
                            const updated = await adminScheduleApi.cancel(id, reason, notify);
                            setEntry(updated);
                        } catch (err) {
                            if (err instanceof ApiError) {
                                const body = err.data as { message?: string } | null;
                                throw new Error(body?.message ?? 'Не удалось отменить занятие');
                            }
                            throw err;
                        }
                    }}
```

- [ ] **Step 3: `MoveClassConfirm` — checkbox + pass `notify` to update**

Add a `notify` state:

```tsx
    const [notify, setNotify] = useState(true);
```

Pass it to the API in `handleConfirm`:

```tsx
            await adminScheduleApi.update(item.id, { startTime: newStartTime }, notify);
```

Render the checkbox in place of / below the existing `isWithinNotifyWindow(newStartTime)` warning:

```tsx
            {isWithinNotifyWindow(newStartTime) && (
                <>
                    <p className="text-amber-600 mb-2 text-sm">⚠️ {PUSH_WARNING}</p>
                    <label className="text-body mb-4 flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={notify}
                            onChange={(e) => setNotify(e.target.checked)}
                            className="h-4 w-4"
                        />
                        Уведомить пользователей
                    </label>
                </>
            )}
```

- [ ] **Step 4: Build + lint**

Run: `npx nx build admin` → succeeds.
Run: `npx nx lint admin` → clean.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/CancelClassModal.tsx apps/admin/src/pages/ScheduleEditPage.tsx apps/admin/src/features/schedule/MoveClassConfirm.tsx
git commit -m "feat(admin): notify-users checkbox in cancel + move modals"
```

---

## Final verification

- [ ] **Run the affected sweep**

```bash
npx nx run-many -t test lint build -p api admin
```
Expected: all green. (db/bot-core untouched by this feature.)

- [ ] **Manual smoke (browser, no prod bot):** create/edit/cancel/delete a class within 5 days → confirm shows the "Уведомить пользователей" checkbox (checked); unchecking + confirming sends `notify:false` and enqueues NO outbox rows; leaving it checked enqueues rows for all linked customers. Actions on classes >5 days out show no checkbox.

---

## Notes / out of scope
- No global on/off switch, no per-customer opt-out, no remembering the admin's choice between actions (all explicitly out of scope).
- `bulkCreate`/`bulkDelete` remain silent and ignore `notify`.
