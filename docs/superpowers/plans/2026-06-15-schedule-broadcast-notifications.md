# Schedule Broadcast Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify all linked-Telegram customers (not just reminder-subscribers) when an admin creates, edits, cancels, or deletes a single class within the next 5 days, with an admin confirmation modal.

**Architecture:** Reuse the existing `event → ScheduleNotificationListener → notification_outbox → cron dispatcher` pipeline. A unified listener replaces the two current per-action listeners; recipients come from a new `CustomerService.findBroadcastRecipients()`; a shared 5-day gate decides whether to enqueue. Bulk operations stay silent. The admin UI gates the same actions behind a confirmation dialog.

**Tech Stack:** NestJS + TypeORM + `@nestjs/event-emitter` + grammy (API), React + Vite + vitest (admin), Jest (API), Nx monorepo (Node 22 — run `nvm use 22.13.1` before nx).

**Spec:** `docs/superpowers/specs/2026-06-15-schedule-broadcast-notifications-design.md`

**Pre-req for every command below:** `source ~/.nvm/nvm.sh && nvm use 22.13.1` (nx needs Node 22).

---

## Phase A — Backend (API)

### Task A1: 5-day notify-window gate util

**Files:**
- Create: `apps/api/src/modules/reminder/notify-window.ts`
- Test: `apps/api/src/modules/reminder/__tests__/notify-window.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/reminder/__tests__/notify-window.spec.ts
import { isWithinNotifyWindow, NOTIFY_WINDOW_DAYS } from '../notify-window';

describe('isWithinNotifyWindow', () => {
    const now = new Date('2026-06-15T12:00:00Z');

    it('is true for a class later today', () => {
        expect(isWithinNotifyWindow(new Date('2026-06-15T18:00:00Z'), now)).toBe(true);
    });

    it('is true on the far edge (exactly +5 days)', () => {
        const edge = new Date(now.getTime() + NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
        expect(isWithinNotifyWindow(edge, now)).toBe(true);
    });

    it('is false past the window (+5 days and 1 minute)', () => {
        const past = new Date(now.getTime() + NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000 + 60_000);
        expect(isWithinNotifyWindow(past, now)).toBe(false);
    });

    it('is false for a class already in the past', () => {
        expect(isWithinNotifyWindow(new Date('2026-06-15T11:59:00Z'), now)).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api --testFile=notify-window`
Expected: FAIL — cannot find module `../notify-window`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/reminder/notify-window.ts

/** Schedule changes only push to users when the class falls inside this window. */
export const NOTIFY_WINDOW_DAYS = 5;

const WINDOW_MS = NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * True when `startTime` is between now and now + NOTIFY_WINDOW_DAYS (inclusive).
 * Past classes return false — we never push about something that already happened.
 * Authoritative server-side gate; the admin UI mirrors this only for modal copy.
 */
export function isWithinNotifyWindow(startTime: Date, now: Date): boolean {
    const t = startTime.getTime();
    return t >= now.getTime() && t <= now.getTime() + WINDOW_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api --testFile=notify-window`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/reminder/notify-window.ts apps/api/src/modules/reminder/__tests__/notify-window.spec.ts
git commit -m "feat(api): add 5-day notify-window gate util"
```

---

### Task A2: CustomerService.findBroadcastRecipients

**Files:**
- Modify: `apps/api/src/modules/customer/customer.service.ts` (add method after `findTelegramIdsByCustomerIds`)
- Test: `apps/api/src/modules/customer/__tests__/customer-broadcast-recipients.spec.ts` (new, self-contained)

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/customer/__tests__/customer-broadcast-recipients.spec.ts
import { Customer, CustomerMembership, Reminder } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CustomerService } from '../customer.service';

describe('CustomerService.findBroadcastRecipients', () => {
    let service: CustomerService;
    let getRawMany: jest.Mock;

    beforeEach(async () => {
        getRawMany = jest.fn().mockResolvedValue([
            { id: 'c1', telegramId: '111' },
            { id: 'c2', telegramId: '222' },
        ]);
        const qb = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getRawMany,
        };
        const customerRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(Reminder), useValue: {} },
                { provide: getRepositoryToken(CustomerMembership), useValue: {} },
            ],
        }).compile();

        service = module.get(CustomerService);
    });

    it('returns id + numeric telegramId for all linked, active customers', async () => {
        const result = await service.findBroadcastRecipients();
        expect(result).toEqual([
            { id: 'c1', telegramId: 111 },
            { id: 'c2', telegramId: 222 },
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api --testFile=customer-broadcast-recipients`
Expected: FAIL — `service.findBroadcastRecipients is not a function`.

- [ ] **Step 3: Write minimal implementation**

Add this method to `CustomerService` immediately after `findTelegramIdsByCustomerIds` (around line 99):

```ts
    /**
     * Broadcast audience for schedule-change notifications: every customer who
     * linked their Telegram and is still active. `telegramId IS NULL` is filtered
     * at the SQL layer so callers never see nulls.
     */
    async findBroadcastRecipients(): Promise<{ id: string; telegramId: number }[]> {
        const rows = await this.customerRepo
            .createQueryBuilder('c')
            .select(['c.id AS "id"', 'c.telegramId AS "telegramId"'])
            .where('c.telegramId IS NOT NULL')
            .andWhere('c.isActive = true')
            .getRawMany<{ id: string; telegramId: string }>();

        return rows.map((row) => ({ id: row.id, telegramId: Number(row.telegramId) }));
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test api --testFile=customer-broadcast-recipients`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/customer/customer.service.ts apps/api/src/modules/customer/__tests__/customer-broadcast-recipients.spec.ts
git commit -m "feat(api): add CustomerService.findBroadcastRecipients"
```

---

### Task A3: Extend outbox notification type enum

**Files:**
- Modify: `libs/db/src/entities/notification-outbox.entity.ts:35`

- [ ] **Step 1: Widen the type union**

Replace:

```ts
export type TOutboxNotificationType = 'schedule_changed' | 'schedule_cancelled';
```

with:

```ts
export type TOutboxNotificationType =
    | 'schedule_created'
    | 'schedule_changed'
    | 'schedule_cancelled'
    | 'schedule_deleted';
```

(`type` is a `text` column — no DB migration needed.)

- [ ] **Step 2: Verify the db lib compiles**

Run: `npx nx build db`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add libs/db/src/entities/notification-outbox.entity.ts
git commit -m "feat(db): add schedule_created/schedule_deleted outbox types"
```

---

### Task A4: Schedule events — add CREATED/DELETED + snapshot on CHANGED

**Files:**
- Modify: `apps/api/src/modules/admin/schedule/schedule.events.ts`

- [ ] **Step 1: Replace the file contents**

```ts
// apps/api/src/modules/admin/schedule/schedule.events.ts
/**
 * Contract between admin schedule mutations and the broadcast notification
 * listener. Admin writes emit; the reminder listener subscribes. Kept in a
 * dependency-free file so both sides can import the constants without dragging
 * unrelated module wiring through their import graph.
 *
 * Every payload carries a `snapshot` so the listener never re-reads the DB —
 * essential for SCHEDULE_DELETED, where the row no longer exists.
 */

/** Class details sufficient to build any notification message body. */
export interface IScheduleSnapshot {
    className: string;
    coachName: string;
    /** The class start time the message should display (new time for edits). */
    startTime: Date;
}

export const SCHEDULE_CREATED_EVENT = 'schedule.created';

export interface IScheduleCreatedPayload {
    scheduleEntryId: string;
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_CHANGED_EVENT = 'schedule.changed';

export interface IScheduleChangedPayload {
    scheduleEntryId: string;
    oldStartTime: Date;
    newStartTime: Date;
    oldDurationMinutes: number;
    newDurationMinutes: number;
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_CANCELLED_EVENT = 'schedule.cancelled';

export interface IScheduleCancelledPayload {
    scheduleEntryId: string;
    /** Free-text reason the admin supplied; null when omitted. */
    cancellationReason: string | null;
    /** Customer UUIDs that had pending reminders at cancel time. Retained for
     *  audit/forensics; recipients are now ALL linked customers, not these. */
    affectedCustomerIds: string[];
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_DELETED_EVENT = 'schedule.deleted';

export interface IScheduleDeletedPayload {
    scheduleEntryId: string;
    snapshot: IScheduleSnapshot;
}
```

- [ ] **Step 2: Verify (will not compile yet — service/listener updated in A5/A6)**

Run: `npx nx build api`
Expected: FAIL referencing the change/cancel payloads missing `snapshot` — that's expected; A6 fixes the emitters and A5 the listener. Do NOT commit alone; commit together with A5+A6, OR proceed and let the next tasks green the build.

> NOTE: Tasks A4, A5, A6 form one compile unit. Implement A4 → A5 → A6, then build/commit. The per-task commits below assume you complete them in sequence; if you prefer, squash A4–A6 into one commit.

---

### Task A5: Unified ScheduleNotificationListener (replaces two listeners)

**Files:**
- Create: `apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts`
- Create: `apps/api/src/modules/reminder/__tests__/schedule-notification.listener.spec.ts`
- Delete: `apps/api/src/modules/reminder/listeners/schedule-change.listener.ts`
- Delete: `apps/api/src/modules/reminder/listeners/schedule-cancellation.listener.ts`
- Delete: `apps/api/src/modules/reminder/__tests__/schedule-change.listener.spec.ts`
- Delete: `apps/api/src/modules/reminder/__tests__/schedule-cancellation.listener.spec.ts`
- Modify: `apps/api/src/modules/reminder/reminder.module.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/reminder/__tests__/schedule-notification.listener.spec.ts
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import type {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    IScheduleSnapshot,
} from '../../admin/schedule/schedule.events';
import { CustomerService } from '../../customer/customer.service';
import { ScheduleNotificationListener } from '../listeners/schedule-notification.listener';
import { NotificationOutboxService } from '../notification-outbox.service';

// Fixed clock so the 5-day gate is deterministic.
const NOW = new Date('2026-06-15T12:00:00Z');
const inWindow = new Date('2026-06-16T10:00:00Z'); // +1 day
const outWindow = new Date('2026-06-30T10:00:00Z'); // +15 days

const snapshot = (startTime: Date): IScheduleSnapshot => ({ className: 'Йога', coachName: 'Мария', startTime });

describe('ScheduleNotificationListener', () => {
    let listener: ScheduleNotificationListener;
    let customerService: { findBroadcastRecipients: jest.Mock };
    let outboxService: { enqueue: jest.Mock };

    beforeEach(async () => {
        jest.useFakeTimers().setSystemTime(NOW);
        customerService = {
            findBroadcastRecipients: jest.fn().mockResolvedValue([
                { id: 'c1', telegramId: 111 },
                { id: 'c2', telegramId: 222 },
            ]),
        };
        outboxService = { enqueue: jest.fn().mockResolvedValue(undefined) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ScheduleNotificationListener,
                { provide: CustomerService, useValue: customerService },
                { provide: NotificationOutboxService, useValue: outboxService },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('https://app.example.com') } },
            ],
        }).compile();

        listener = module.get(ScheduleNotificationListener);
    });

    afterEach(() => jest.useRealTimers());

    it('created: enqueues one row per recipient when in window', async () => {
        const payload: IScheduleCreatedPayload = { scheduleEntryId: 's1', snapshot: snapshot(inWindow) };
        await listener.handleCreated(payload);
        expect(outboxService.enqueue).toHaveBeenCalledTimes(2);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first).toMatchObject({ customerId: 'c1', type: 'schedule_created' });
        expect(first.payload.telegramId).toBe(111);
        expect(first.payload.text).toContain('Новое занятие');
        expect(first.payload.webAppUrl).toBe('https://app.example.com/schedule/s1');
    });

    it('created: no-op when out of window', async () => {
        await listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(outWindow) });
        expect(customerService.findBroadcastRecipients).not.toHaveBeenCalled();
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('changed: text has old + new time, type schedule_changed', async () => {
        const payload: IScheduleChangedPayload = {
            scheduleEntryId: 's1',
            oldStartTime: new Date('2026-06-16T09:00:00Z'),
            newStartTime: inWindow,
            oldDurationMinutes: 60,
            newDurationMinutes: 60,
            snapshot: snapshot(inWindow),
        };
        await listener.handleChanged(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_changed');
        expect(first.payload.text).toContain('Изменение в расписании');
    });

    it('cancelled: type schedule_cancelled, includes reason', async () => {
        const payload: IScheduleCancelledPayload = {
            scheduleEntryId: 's1',
            cancellationReason: 'Тренер заболел',
            affectedCustomerIds: [],
            snapshot: snapshot(inWindow),
        };
        await listener.handleCancelled(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_cancelled');
        expect(first.payload.text).toContain('отменено');
        expect(first.payload.text).toContain('Тренер заболел');
    });

    it('deleted: type schedule_deleted, cancelled-style copy', async () => {
        const payload: IScheduleDeletedPayload = { scheduleEntryId: 's1', snapshot: snapshot(inWindow) };
        await listener.handleDeleted(payload);
        const first = outboxService.enqueue.mock.calls[0][0];
        expect(first.type).toBe('schedule_deleted');
        expect(first.payload.text).toContain('отменено');
    });

    it('no-op when there are no recipients', async () => {
        customerService.findBroadcastRecipients.mockResolvedValueOnce([]);
        await listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(inWindow) });
        expect(outboxService.enqueue).not.toHaveBeenCalled();
    });

    it('swallows enqueue failures (never throws to the event bus)', async () => {
        outboxService.enqueue.mockRejectedValueOnce(new Error('db down'));
        await expect(
            listener.handleCreated({ scheduleEntryId: 's1', snapshot: snapshot(inWindow) }),
        ).resolves.toBeUndefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test api --testFile=schedule-notification.listener`
Expected: FAIL — cannot find module `../listeners/schedule-notification.listener`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import type { TOutboxNotificationType } from '@fitcalendar/db';
import { format, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

import type {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    IScheduleSnapshot,
} from '../../admin/schedule/schedule.events';
import {
    SCHEDULE_CANCELLED_EVENT,
    SCHEDULE_CHANGED_EVENT,
    SCHEDULE_CREATED_EVENT,
    SCHEDULE_DELETED_EVENT,
} from '../../admin/schedule/schedule.events';
import { CustomerService } from '../../customer/customer.service';
import { isWithinNotifyWindow } from '../notify-window';
import { NotificationOutboxService } from '../notification-outbox.service';

/**
 * Single subscriber for all admin schedule mutations. Replaces the per-action
 * Story 5.4/5.5 listeners. Broadcasts to ALL linked customers (not subscribers),
 * gated to the 5-day notify window. Snapshot-driven — never reads the DB.
 */
@Injectable()
export class ScheduleNotificationListener {
    private readonly logger = new Logger(ScheduleNotificationListener.name);
    private readonly miniAppUrl: string | undefined;

    constructor(
        private readonly customerService: CustomerService,
        private readonly outboxService: NotificationOutboxService,
        configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
    }

    @OnEvent(SCHEDULE_CREATED_EVENT)
    async handleCreated(payload: IScheduleCreatedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_created',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.createdMessage(payload.snapshot),
        });
    }

    @OnEvent(SCHEDULE_CHANGED_EVENT)
    async handleChanged(payload: IScheduleChangedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_changed',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.newStartTime,
            text: this.changedMessage(payload),
        });
    }

    @OnEvent(SCHEDULE_CANCELLED_EVENT)
    async handleCancelled(payload: IScheduleCancelledPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_cancelled',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.cancelledMessage(payload.snapshot, payload.cancellationReason),
        });
    }

    @OnEvent(SCHEDULE_DELETED_EVENT)
    async handleDeleted(payload: IScheduleDeletedPayload): Promise<void> {
        await this.broadcast({
            type: 'schedule_deleted',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.cancelledMessage(payload.snapshot, null),
        });
    }

    private async broadcast(opts: {
        type: TOutboxNotificationType;
        scheduleEntryId: string;
        gateStartTime: Date;
        text: string;
    }): Promise<void> {
        if (!isWithinNotifyWindow(opts.gateStartTime, new Date())) return;

        const recipients = await this.customerService.findBroadcastRecipients();
        if (recipients.length === 0) return;

        const webAppUrl = this.miniAppUrl ? `${this.miniAppUrl}/schedule/${opts.scheduleEntryId}` : undefined;

        await Promise.all(
            recipients.map((recipient) =>
                this.outboxService
                    .enqueue({
                        customerId: recipient.id,
                        type: opts.type,
                        payload: {
                            telegramId: recipient.telegramId,
                            text: opts.text,
                            webAppUrl,
                            scheduleEntryId: opts.scheduleEntryId,
                        },
                    })
                    .catch((err) => {
                        this.logger.error(
                            {
                                event: 'schedule.broadcast.enqueue_failed',
                                type: opts.type,
                                scheduleEntryId: opts.scheduleEntryId,
                                telegramId: recipient.telegramId,
                                error: err instanceof Error ? err.message : String(err),
                            },
                            'Failed to enqueue schedule broadcast notification',
                        );
                    }),
            ),
        );
    }

    private createdMessage(s: IScheduleSnapshot): string {
        return [
            '🆕 <b>Новое занятие</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${this.formatTiming(s.startTime)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ].join('\n');
    }

    private changedMessage(p: IScheduleChangedPayload): string {
        return [
            '⚠️ <b>Изменение в расписании</b>',
            '',
            `Занятие <b>${escapeHtml(p.snapshot.className)}</b>`,
            `❌ <s>Было: ${this.formatTiming(p.oldStartTime)}</s>`,
            `✅ Будет: <b>${this.formatTiming(p.newStartTime)}</b>`,
            `👤 Тренер: ${escapeHtml(p.snapshot.coachName)}`,
        ].join('\n');
    }

    private cancelledMessage(s: IScheduleSnapshot, reason: string | null): string {
        const lines = [
            '❌ <b>Занятие отменено</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${this.formatTiming(s.startTime)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ];
        const trimmed = reason?.trim();
        if (trimmed) lines.push('', `Причина: ${escapeHtml(trimmed)}`);
        return lines.join('\n');
    }

    private formatTiming(startTime: Date): string {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const hhmm = format(startTime, 'HH:mm', { locale: ru });
        if (isSameDay(startTime, now)) return `Сегодня в ${hhmm}`;
        if (isSameDay(startTime, tomorrow)) return `Завтра в ${hhmm}`;
        return `${format(startTime, 'd MMMM', { locale: ru })} в ${hhmm}`;
    }
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

- [ ] **Step 4: Delete the two old listeners and their specs**

```bash
git rm apps/api/src/modules/reminder/listeners/schedule-change.listener.ts \
       apps/api/src/modules/reminder/listeners/schedule-cancellation.listener.ts \
       apps/api/src/modules/reminder/__tests__/schedule-change.listener.spec.ts \
       apps/api/src/modules/reminder/__tests__/schedule-cancellation.listener.spec.ts
```

- [ ] **Step 5: Wire the new listener into reminder.module.ts**

In `apps/api/src/modules/reminder/reminder.module.ts`:
- Remove the two imports of `ScheduleCancellationListener` and `ScheduleChangeNotificationListener`.
- Add: `import { ScheduleNotificationListener } from './listeners/schedule-notification.listener';`
- In `providers`, replace the two old listener entries with `ScheduleNotificationListener`.

Resulting providers array:

```ts
    providers: [
        ReminderService,
        ReminderDispatcherService,
        NotificationOutboxService,
        NotificationOutboxDispatcher,
        ScheduleNotificationListener,
    ],
```

> The new listener injects `CustomerService` (already used by the old cancellation listener; `CustomerModule` is `@Global`, so no import change needed).

- [ ] **Step 6: Run the new listener test (build will still fail until A6 — that's fine for the unit test)**

Run: `npx nx test api --testFile=schedule-notification.listener`
Expected: PASS (7 tests). The listener compiles standalone; only the emitters (A6) still reference the old payload shape.

- [ ] **Step 7: Do A6 next, then build + commit A4+A5+A6 together** (see A6 Step 5).

---

### Task A6: AdminScheduleService — emit on create/delete, snapshot on changed, lift delete block

**Files:**
- Modify: `apps/api/src/modules/admin/schedule/admin-schedule.service.ts`
- Modify: `apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts`

- [ ] **Step 1: Update the events import** (top of `admin-schedule.service.ts`)

Replace the existing events import block with:

```ts
import {
    IScheduleCancelledPayload,
    IScheduleChangedPayload,
    IScheduleCreatedPayload,
    IScheduleDeletedPayload,
    SCHEDULE_CANCELLED_EVENT,
    SCHEDULE_CHANGED_EVENT,
    SCHEDULE_CREATED_EVENT,
    SCHEDULE_DELETED_EVENT,
} from './schedule.events';
```

- [ ] **Step 2: Emit SCHEDULE_CREATED in `create()`**

In `create()`, replace the tail (from `this.logger.log(\`Created...`) with:

```ts
        this.logger.log(`Created schedule entry ${saved.id}`);
        // Reload guaranteed because we just saved it.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const item = reloaded!;
        const createdPayload: IScheduleCreatedPayload = {
            scheduleEntryId: item.id,
            snapshot: {
                className: item.trainingType.name,
                coachName: item.coach.name,
                startTime: item.startTime,
            },
        };
        this.eventEmitter.emit(SCHEDULE_CREATED_EVENT, createdPayload);
        return toAdminScheduleItem(item);
```

> `bulkCreate()` is intentionally left unchanged — bulk stays silent.

- [ ] **Step 3: Add `snapshot` to the SCHEDULE_CHANGED emission in `update()`**

In `update()`, move the relations reload above the emit block and include the snapshot. Replace the section from `if (startTimeChanged || durationChanged) {` through the final `return toAdminScheduleItem(reloaded!);` with:

```ts
        const reloaded = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });

        if (startTimeChanged || durationChanged) {
            const payload: IScheduleChangedPayload = {
                scheduleEntryId: id,
                oldStartTime,
                newStartTime,
                oldDurationMinutes,
                newDurationMinutes,
                snapshot: {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    className: reloaded!.trainingType.name,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    coachName: reloaded!.coach.name,
                    startTime: newStartTime,
                },
            };
            this.eventEmitter.emit(SCHEDULE_CHANGED_EVENT, payload);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return toAdminScheduleItem(reloaded!);
```

- [ ] **Step 4: Add `snapshot` to the SCHEDULE_CANCELLED emission in `cancel()`**

The cancel payload already has `snapshot` (className/startTime/coachName) — confirm it matches `IScheduleSnapshot` (it does). No change needed beyond the type now requiring it (already present). Verify the existing object literal still satisfies the interface.

- [ ] **Step 5: Lift the delete block + emit SCHEDULE_DELETED in `deleteEntry()`**

Replace `deleteEntry()` body's guard + remove + audit section so it no longer throws on reminders and emits the event:

```ts
    async deleteEntry(id: string, audit?: IAuditContext): Promise<void> {
        const entry = await this.scheduleRepo.findOne({
            where: { id },
            relations: ['coach', 'trainingType'],
        });
        if (!entry) {
            throw new NotFoundException(`Schedule entry ${id} not found`);
        }
        const snapshot = {
            className: entry.trainingType?.name ?? 'Занятие',
            coachName: entry.coach?.name ?? '—',
            startTime: entry.startTime,
        };
        await this.scheduleRepo.remove(entry);
        this.logger.log(`Deleted schedule entry ${id}`);

        const deletedPayload: IScheduleDeletedPayload = { scheduleEntryId: id, snapshot };
        this.eventEmitter.emit(SCHEDULE_DELETED_EVENT, deletedPayload);

        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_schedule_entry',
            resourceType: 'schedule_entry',
            resourceId: id,
            metadata: { startTime: snapshot.startTime, coachName: snapshot.coachName, className: snapshot.className },
        });
    }
```

> The `reminders` relation and the `ConflictException` block are removed. `ConflictException` may now be unused in this file — leave it if `bulkDelete`/others still use it; otherwise remove the import to satisfy lint. **Check after editing**: `grep -n ConflictException apps/api/src/modules/admin/schedule/admin-schedule.service.ts`. If only the import remains, drop `ConflictException` from the `@nestjs/common` import.

> `bulkDelete()` keeps its `has_subscribers` guard and emits nothing — unchanged.

- [ ] **Step 6: Update the service spec**

In `apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts`:

(a) Add the new events to the existing events import (alongside `SCHEDULE_CANCELLED_EVENT`):
```ts
import { SCHEDULE_CREATED_EVENT, SCHEDULE_DELETED_EVENT } from '../schedule.events';
```
(Merge into the existing import from `'../schedule.events'` if present.)

(b) In `describe('create (Story 6.3)')`, add:
```ts
        it('emits SCHEDULE_CREATED with a snapshot', async () => {
            // Reuse the describe block's existing create happy-path setup/mocks.
            // After the create call resolves:
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CREATED_EVENT,
                expect.objectContaining({
                    scheduleEntryId: expect.any(String),
                    snapshot: expect.objectContaining({ className: expect.any(String), coachName: expect.any(String) }),
                }),
            );
        });
```

(c) In the changed-event assertions (lines ~273–295), change the matcher to tolerate the new `snapshot` field — replace exact payload matchers with:
```ts
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_CHANGED_EVENT,
                expect.objectContaining({ snapshot: expect.objectContaining({ startTime: expect.any(Date) }) }),
            );
```

(d) Replace the delete-block test (`throws 409 when class has any reminders`, ~line 474) with:
```ts
        it('deletes a class that has reminders and emits SCHEDULE_DELETED (block lifted)', async () => {
            const entry = buildEntry({
                id: 'sched-with-subs',
                reminders: [{ id: 'rem-1' }],
            } as Partial<ScheduleEntry>);
            scheduleRepo.findOne.mockResolvedValueOnce(entry);
            scheduleRepo.remove.mockResolvedValueOnce(entry);

            await expect(service.deleteEntry('sched-with-subs')).resolves.toBeUndefined();
            expect(scheduleRepo.remove).toHaveBeenCalledWith(entry);
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                SCHEDULE_DELETED_EVENT,
                expect.objectContaining({ scheduleEntryId: 'sched-with-subs' }),
            );
        });
```

(e) In the two existing delete happy-path tests (`removes the entry when class is in the past...`, `removes a FUTURE class...`), add after the existing assertions:
```ts
            expect(eventEmitter.emit).toHaveBeenCalledWith(SCHEDULE_DELETED_EVENT, expect.anything());
```

> If `ConflictException` is no longer referenced in the spec after removing the 409 test, drop it from the spec's `@nestjs/common` import to satisfy lint.

- [ ] **Step 7: Build, run API tests, commit A4+A5+A6**

Run:
```bash
npx nx build api
npx nx test api
```
Expected: build succeeds; all API tests pass (new listener spec, notify-window, customer-broadcast, updated admin-schedule spec).

```bash
git add apps/api/src/modules/admin/schedule/schedule.events.ts \
        apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts \
        apps/api/src/modules/reminder/__tests__/schedule-notification.listener.spec.ts \
        apps/api/src/modules/reminder/reminder.module.ts \
        apps/api/src/modules/admin/schedule/admin-schedule.service.ts \
        apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts
# The two deleted listeners + specs are already staged by `git rm` in A5 Step 4.
git commit -m "feat(api): broadcast schedule create/change/cancel/delete to all linked customers"
```

---

### Task A7: Raise outbox dispatcher batch size for broadcast volume

**Files:**
- Modify: `apps/api/src/modules/reminder/notification-outbox-dispatcher.service.ts:10`

- [ ] **Step 1: Bump TICK_BATCH**

Replace:

```ts
/** Max rows processed per dispatcher tick. Keeps the loop bounded. */
const TICK_BATCH = 50;
```

with:

```ts
/**
 * Max rows processed per dispatcher tick. Sized for broadcast volume: a single
 * schedule change now enqueues one row per linked customer, so 50/min would
 * trickle. 300/min ≈ 5 sends/s — well under Telegram's ~30/s global cap.
 */
const TICK_BATCH = 300;
```

- [ ] **Step 2: Verify API still builds + tests pass**

Run: `npx nx test api --testFile=notification-outbox-dispatcher`
Expected: PASS (existing dispatcher tests unaffected).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/reminder/notification-outbox-dispatcher.service.ts
git commit -m "perf(api): raise outbox tick batch to 300 for broadcast volume"
```

---

## Phase B — Admin frontend

### Task B1: Admin notify-window util + warning copy

**Files:**
- Create: `apps/admin/src/features/schedule/notify-window.ts`
- Test: `apps/admin/src/features/schedule/notify-window.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/admin/src/features/schedule/notify-window.spec.ts
import { describe, expect, it } from 'vitest';

import { isWithinNotifyWindow } from './notify-window';

const now = new Date('2026-06-15T12:00:00Z');

describe('isWithinNotifyWindow (admin)', () => {
    it('true for a class tomorrow', () => {
        expect(isWithinNotifyWindow('2026-06-16T10:00:00Z', now)).toBe(true);
    });
    it('false for a class 15 days out', () => {
        expect(isWithinNotifyWindow('2026-06-30T10:00:00Z', now)).toBe(false);
    });
    it('false for a past class', () => {
        expect(isWithinNotifyWindow('2026-06-14T10:00:00Z', now)).toBe(false);
    });
    it('false for an invalid date string', () => {
        expect(isWithinNotifyWindow('not-a-date', now)).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx nx test admin --testFile=notify-window`
Expected: FAIL — cannot find `./notify-window`.

- [ ] **Step 3: Write the implementation**

```ts
// apps/admin/src/features/schedule/notify-window.ts

/** Mirror of the API gate (apps/api/.../reminder/notify-window.ts) for modal copy. */
export const NOTIFY_WINDOW_DAYS = 5;

const WINDOW_MS = NOTIFY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** Warning shown before an action that will push to every bot user. */
export const PUSH_WARNING =
    'Занятие в ближайшие 5 дней. Все пользователи бота получат пуш-уведомление об этом.';

/** True when the ISO start time is between now and now + 5 days (inclusive). */
export function isWithinNotifyWindow(startTimeIso: string, now: Date = new Date()): boolean {
    const t = new Date(startTimeIso).getTime();
    if (Number.isNaN(t)) return false;
    return t >= now.getTime() && t <= now.getTime() + WINDOW_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx nx test admin --testFile=notify-window`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/notify-window.ts apps/admin/src/features/schedule/notify-window.spec.ts
git commit -m "feat(admin): add notify-window util + push warning copy"
```

---

### Task B2: Reusable ConfirmDialog + useConfirm hook

**Files:**
- Create: `apps/admin/src/shared/components/ConfirmDialog.tsx`

- [ ] **Step 1: Write the component + hook**

```tsx
// apps/admin/src/shared/components/ConfirmDialog.tsx
import { useState, type ReactNode } from 'react';

import { Modal } from './Modal';

interface IConfirmDialogProps {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** Destructive styling for the confirm button (delete/cancel actions). */
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** One-shot confirm modal built on the shared Modal. */
export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Продолжить',
    danger = false,
    onConfirm,
    onClose,
}: IConfirmDialogProps): JSX.Element {
    return (
        <Modal title={title} onClose={onClose}>
            <div className="text-body mb-4">{message}</div>
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
                    onClick={onConfirm}
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
}

/**
 * Promise-based confirm. Usage:
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title, message }))) return;
 *   ...render {dialog} once in the component tree.
 */
export function useConfirm(): {
    confirm: (req: IConfirmRequest) => Promise<boolean>;
    dialog: JSX.Element | null;
} {
    const [state, setState] = useState<{ req: IConfirmRequest; resolve: (ok: boolean) => void } | null>(null);

    const confirm = (req: IConfirmRequest): Promise<boolean> =>
        new Promise<boolean>((resolve) => setState({ req, resolve }));

    const settle = (ok: boolean): void => {
        state?.resolve(ok);
        setState(null);
    };

    const dialog = state ? (
        <ConfirmDialog
            title={state.req.title}
            message={state.req.message}
            confirmLabel={state.req.confirmLabel}
            danger={state.req.danger}
            onConfirm={() => settle(true)}
            onClose={() => settle(false)}
        />
    ) : null;

    return { confirm, dialog };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/shared/components/ConfirmDialog.tsx
git commit -m "feat(admin): add reusable ConfirmDialog + useConfirm hook"
```

---

### Task B3: Gate delete + edit-save behind push confirm (ScheduleEditPage)

**Files:**
- Modify: `apps/admin/src/pages/ScheduleEditPage.tsx`

- [ ] **Step 1: Add imports**

```tsx
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { isWithinNotifyWindow, PUSH_WARNING } from '@/features/schedule/notify-window';
```

- [ ] **Step 2: Use the hook inside the component**

Add near the other hooks:

```tsx
    const { confirm, dialog: confirmDialog } = useConfirm();
```

- [ ] **Step 3: Replace `handleDelete` to use the confirm dialog with conditional push copy**

```tsx
    const handleDelete = async () => {
        if (!id || !entry) return;
        const willPush = isWithinNotifyWindow(entry.startTime);
        const ok = await confirm({
            title: 'Удалить занятие?',
            message: willPush
                ? `${PUSH_WARNING} Занятие будет удалено безвозвратно. Продолжить?`
                : 'Занятие будет удалено безвозвратно. Продолжить?',
            confirmLabel: 'Удалить',
            danger: true,
        });
        if (!ok) return;
        setDeleteError(null);
        try {
            await adminScheduleApi.delete(id);
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

- [ ] **Step 4: Gate the edit save (`ScheduleForm` onSubmit) with the push confirm**

In the `<ScheduleForm ... onSubmit={...}>`, add the confirm at the top of the handler:

```tsx
                onSubmit={async (payload) => {
                    if (!id) return;
                    if (isWithinNotifyWindow(payload.startTime)) {
                        const ok = await confirm({
                            title: 'Сохранить изменения?',
                            message: `${PUSH_WARNING} Продолжить?`,
                            confirmLabel: 'Сохранить',
                        });
                        if (!ok) return;
                    }
                    try {
                        await adminScheduleApi.update(id, payload);
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

- [ ] **Step 5: Render the confirm dialog**

Just before the closing `</div>` of the page's root, add:

```tsx
            {confirmDialog}
```

- [ ] **Step 6: Update the stale "Удалить" button tooltip**

Change the button's `title` (it currently claims delete is blocked for classes with sign-ups) to:

```tsx
                        title="Удаление занятия в ближайшие 5 дней отправит пуш всем пользователям бота."
```

- [ ] **Step 7: Verify build**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/admin/src/pages/ScheduleEditPage.tsx
git commit -m "feat(admin): confirm push on schedule edit/delete within 5 days"
```

---

### Task B4: MoveClassConfirm — conditional push warning

**Files:**
- Modify: `apps/admin/src/features/schedule/MoveClassConfirm.tsx`

- [ ] **Step 1: Add import**

```tsx
import { isWithinNotifyWindow, PUSH_WARNING } from './notify-window';
```

- [ ] **Step 2: Replace the static notice line**

Replace:

```tsx
            <p className="text-body-secondary mb-4 text-sm">Записанные клиенты получат уведомление.</p>
```

with:

```tsx
            {isWithinNotifyWindow(newStartTime) && (
                <p className="text-amber-600 mb-4 text-sm">⚠️ {PUSH_WARNING}</p>
            )}
```

- [ ] **Step 3: Verify build**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/schedule/MoveClassConfirm.tsx
git commit -m "feat(admin): push warning in move-class confirm within window"
```

---

### Task B5: CancelClassModal — conditional push warning

**Files:**
- Modify: `apps/admin/src/features/schedule/CancelClassModal.tsx`
- Modify: `apps/admin/src/pages/ScheduleEditPage.tsx` (pass the flag)

- [ ] **Step 1: Add a `willPush` prop to CancelClassModal**

In `ICancelClassModalProps` add:

```tsx
    /** When true, show that cancelling pushes all bot users (class within 5 days). */
    willPush?: boolean;
```

Add `willPush` to the destructured props, and render the warning after the title/subtitle block (before the reason textarea):

```tsx
                {willPush && (
                    <p className="text-amber-600 mb-4 text-sm">
                        ⚠️ Занятие в ближайшие 5 дней. Все пользователи бота получат пуш об отмене.
                    </p>
                )}
```

- [ ] **Step 2: Pass the flag from ScheduleEditPage**

In the `<CancelClassModal ... />` usage, add:

```tsx
                    willPush={isWithinNotifyWindow(entry.startTime)}
```

(`isWithinNotifyWindow` is already imported from Task B3.)

- [ ] **Step 3: Verify build**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/schedule/CancelClassModal.tsx apps/admin/src/pages/ScheduleEditPage.tsx
git commit -m "feat(admin): push warning in cancel-class modal within window"
```

---

### Task B6: Create flow — recurring no-push info + single-create push confirm

**Files:**
- Modify: `apps/admin/src/features/schedule/ScheduleForm.tsx` (recurring info line)
- Modify: `apps/admin/src/features/schedule/CreateClassDialog.tsx` (single-create confirm)

- [ ] **Step 1: Add the recurring no-push info line in ScheduleForm**

Inside the `{repeat && ( ... )}` block (after the "Будет создано занятий" count line), add:

```tsx
                            <p className="text-body-secondary text-xs">
                                ℹ️ При создании с повторениями уведомления пользователям не отправляются.
                            </p>
```

- [ ] **Step 2: Add the single-create push confirm in CreateClassDialog**

Add imports:

```tsx
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { isWithinNotifyWindow, PUSH_WARNING } from '@/features/schedule/notify-window';
```

Use the hook and gate the single-create `onSubmit`; render the dialog inside the Modal:

```tsx
export function CreateClassDialog({ day, onClose, onCreated }: ICreateClassDialogProps): JSX.Element {
    const { confirm, dialog } = useConfirm();
    return (
        <Modal title="Новое занятие" onClose={onClose} panelClassName="max-h-[90vh] overflow-y-auto">
            <ScheduleForm
                initial={{ startTime: dayAtNineISO(day) }}
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    if (isWithinNotifyWindow(payload.startTime)) {
                        const ok = await confirm({
                            title: 'Создать занятие?',
                            message: `${PUSH_WARNING} Продолжить?`,
                            confirmLabel: 'Создать',
                        });
                        if (!ok) return;
                    }
                    try {
                        await adminScheduleApi.create(payload);
                        onCreated(1);
                        onClose();
                    } catch (err) {
                        throw new Error(extractApiMessage(err, 'Не удалось создать занятие'));
                    }
                }}
                onSubmitRecurring={async (entries) => {
                    try {
                        await adminScheduleApi.bulkCreate(entries);
                        onCreated(entries.length);
                        onClose();
                    } catch (err) {
                        throw new Error(extractApiMessage(err, 'Не удалось создать занятия'));
                    }
                }}
                onCancel={onClose}
            />
            {dialog}
        </Modal>
    );
}
```

- [ ] **Step 3: Verify build**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/schedule/ScheduleForm.tsx apps/admin/src/features/schedule/CreateClassDialog.tsx
git commit -m "feat(admin): recurring no-push info + single-create push confirm"
```

---

## Final verification

- [ ] **Run the full affected test + lint + build sweep**

```bash
npx nx run-many -t test lint build -p api admin db bot-core
```
Expected: all green. Investigate and fix any failure before declaring done (see superpowers:verification-before-completion).

- [ ] **Manual smoke (optional, needs a non-prod bot — do NOT use the prod token):**
  - Admin: create a class tomorrow → confirm dialog warns about push.
  - Admin: create with "Повторять" → info line says no push; no confirm dialog.
  - Admin: edit a class >5 days out → no confirm dialog, no push.
  - Admin: cancel/delete a class within 5 days → confirm warns; outbox rows enqueued for all linked customers.

---

## Notes / out of scope

- Prod webhook 502 is a separate operational concern (bot reportedly works; parked).
- No per-customer opt-out (relies on `isActive`); no quiet hours; no dedupe of rapid edits.
- Bulk create/delete stay silent by design; `bulkDelete` keeps its `has_subscribers` guard.
