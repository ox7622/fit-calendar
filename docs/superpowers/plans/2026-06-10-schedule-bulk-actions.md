# Bulk Schedule Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three bulk actions to the admin schedule calendar (copy a whole week, copy one class, create recurring classes by weekday+time) plus a red outline on classes that share the same start time.

**Architecture:** Frontend computes all target dates as pure, unit-tested `date-fns` functions and posts a flat array to a single new backend endpoint `POST /admin/schedule/bulk`, which validates active coach/type and inserts all rows in one transaction. No DB migration, no recurring-series concept — every created class is an ordinary independent `schedule_entries` row.

**Tech Stack:** NestJS 11 + TypeORM (jest), React 19 + Vite admin (vitest), Nx monorepo, date-fns (Russian week, `weekStartsOn: 1`).

---

## Conventions (read first)

- **Node:** run `nvm use 22.13.1` once per shell before any `nx` command (nx needs Node 22 here).
- **Commits:** let the pre-commit hook run (NO `--no-verify`); stage by explicit path. Commit `type` must be one of `feat|fix|docs|refactor|test` (commitlint rejects `chore`/`style`).
- **Weekday convention everywhere in this feature:** ISO `1=Mon … 7=Sun` (matches the Russian Monday-first week). Convert a JS `Date` with `isoWeekday = ((date.getDay() + 6) % 7) + 1`.
- **Time strings:** `"HH:mm"` 24h.
- **Branch:** do this work on a feature branch off the current branch, e.g. `git checkout -b feat/schedule-bulk-actions`.

## File Structure

**Backend (`apps/api/src/modules/admin/schedule/`)**
- `dto/bulk-create-schedule.dto.ts` (new) — request + response DTOs.
- `admin-schedule.service.ts` (modify) — add `bulkCreate`.
- `admin-schedule.controller.ts` (modify) — add `POST bulk` route.
- `__tests__/admin-schedule.service.spec.ts` (modify) — add `bulkCreate` tests.

**Frontend (`apps/admin/src/`)**
- `features/schedule/bulk/build-recurrence.ts` (+ `.spec.ts`)
- `features/schedule/bulk/build-week-copy.ts` (+ `.spec.ts`)
- `features/schedule/bulk/build-duplicate.ts` (+ `.spec.ts`)
- `features/schedule/bulk/find-overlapping-ids.ts` (+ `.spec.ts`)
- `features/schedule/bulk/iso-weekday.ts` (shared helper, + `.spec.ts`)
- `shared/api/schedule.api.ts` (modify) — `bulkCreate` + response type.
- `features/schedule/ScheduleCalendar.tsx` (modify) — red outline.
- `features/schedule/bulk/BulkPreview.tsx` (new) — shared preview/confirm footer.
- `features/schedule/bulk/RecurrenceDialog.tsx` (new)
- `features/schedule/bulk/CopyWeekDialog.tsx` (new)
- `features/schedule/bulk/DuplicateClassDialog.tsx` (new)
- `pages/DashboardPage.tsx` (modify) — toolbar buttons + refetch after create.
- `vite.config.ts` (modify) — add vitest `test` block.
- `tsconfig.spec.json` (new) — vitest typed-lint config.

---

## Task 1: Bulk request/response DTOs

**Files:**
- Create: `apps/api/src/modules/admin/schedule/dto/bulk-create-schedule.dto.ts`

- [ ] **Step 1: Write the DTO file**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';

import { AdminScheduleItemDto } from './admin-schedule-list.dto';
import { CreateScheduleEntryDto } from './create-schedule-entry.dto';

export const BULK_MAX_ENTRIES = 200;

export class BulkCreateScheduleDto {
    @ApiProperty({ type: [CreateScheduleEntryDto], description: `1..${BULK_MAX_ENTRIES} entries` })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(BULK_MAX_ENTRIES)
    @ValidateNested({ each: true })
    @Type(() => CreateScheduleEntryDto)
    entries: CreateScheduleEntryDto[];
}

export class BulkCreateResponseDto {
    @ApiProperty({ example: 12 }) created: number;
    @ApiProperty({ type: [AdminScheduleItemDto] }) items: AdminScheduleItemDto[];
}
```

- [ ] **Step 2: Typecheck**

Run: `nvm use 22.13.1 && pnpm nx run api:build --skip-nx-cache 2>&1 | tail -5` (or rely on the test run in Task 2).
Expected: no TypeScript errors referencing the new file.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/admin/schedule/dto/bulk-create-schedule.dto.ts
git commit -m "feat(admin-schedule): add bulk create request/response DTOs"
```

---

## Task 2: `AdminScheduleService.bulkCreate`

**Files:**
- Test: `apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts`
- Modify: `apps/api/src/modules/admin/schedule/admin-schedule.service.ts`

- [ ] **Step 1: Write the failing tests**

Add this `describe` block inside the top-level `describe('AdminScheduleService', ...)` in the spec. It reuses the existing `buildEntry`, `service`, `scheduleRepo`, `coachRepo`, `trainingTypeRepo`, `dataSource` mocks. Add a `transaction` mock to the existing `dataSource` mock if not present (see Step 3 note).

```ts
describe('bulkCreate', () => {
    const activeCoach = { id: 'c1', isActive: true };
    const activeType = { id: 't1', isActive: true };

    beforeEach(() => {
        coachRepo.findOne.mockResolvedValue(activeCoach as never);
        trainingTypeRepo.findOne.mockResolvedValue(activeType as never);
    });

    it('inserts all entries in one transaction and returns created count', async () => {
        const saved = [buildEntry({ id: 's1' }), buildEntry({ id: 's2' })];
        const managerSave = jest.fn().mockResolvedValue(saved);
        dataSource.transaction.mockImplementation(async (cb: never) =>
            (cb as unknown as (m: unknown) => unknown)({ save: managerSave }),
        );
        scheduleRepo.find.mockResolvedValue(saved as never);

        const result = await service.bulkCreate({
            entries: [
                { coachId: 'c1', trainingTypeId: 't1', startTime: new Date('2026-05-04T10:00:00Z'), durationMinutes: 60 },
                { coachId: 'c1', trainingTypeId: 't1', startTime: new Date('2026-05-06T10:00:00Z'), durationMinutes: 60 },
            ],
        });

        expect(result.created).toBe(2);
        expect(result.items).toHaveLength(2);
        expect(managerSave).toHaveBeenCalledTimes(1);
    });

    it('validates each distinct coach/type once and rejects an inactive coach without inserting', async () => {
        coachRepo.findOne.mockResolvedValue({ id: 'c1', isActive: false } as never);
        const managerSave = jest.fn();
        dataSource.transaction.mockImplementation(async (cb: never) =>
            (cb as unknown as (m: unknown) => unknown)({ save: managerSave }),
        );

        await expect(
            service.bulkCreate({
                entries: [
                    { coachId: 'c1', trainingTypeId: 't1', startTime: new Date('2026-05-04T10:00:00Z'), durationMinutes: 60 },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(managerSave).not.toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `nvm use 22.13.1 && pnpm nx test api -- --testPathPattern admin-schedule.service`
Expected: FAIL — `service.bulkCreate is not a function`.

- [ ] **Step 3: Implement `bulkCreate`**

Add this method to `AdminScheduleService` (after `create`). It reuses the private `assertActiveCoach` / `assertActiveTrainingType`.

```ts
async bulkCreate(dto: BulkCreateScheduleDto): Promise<BulkCreateResponseDto> {
    const coachIds = [...new Set(dto.entries.map((e) => e.coachId))];
    const typeIds = [...new Set(dto.entries.map((e) => e.trainingTypeId))];

    // Validate each distinct coach/type once BEFORE opening the transaction so a
    // bad reference fails fast and nothing is written.
    await Promise.all(coachIds.map((id) => this.assertActiveCoach(id)));
    await Promise.all(typeIds.map((id) => this.assertActiveTrainingType(id)));

    const rows = dto.entries.map((e) =>
        this.scheduleRepo.create({
            coachId: e.coachId,
            trainingTypeId: e.trainingTypeId,
            startTime: e.startTime,
            durationMinutes: e.durationMinutes,
            status: 'scheduled',
        }),
    );

    const saved: ScheduleEntry[] = await this.dataSource.transaction((manager) =>
        manager.save(ScheduleEntry, rows),
    );

    const reloaded = await this.scheduleRepo.find({
        where: { id: In(saved.map((s) => s.id)) },
        relations: ['coach', 'trainingType'],
    });
    this.logger.log(`Bulk-created ${reloaded.length} schedule entries`);
    return { created: reloaded.length, items: reloaded.map(toAdminScheduleItem) };
}
```

Add imports at the top of the service: `import { In } from 'typeorm';` (extend the existing `typeorm` import) and `import { BulkCreateResponseDto, BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';`.

If the spec's `dataSource` mock lacks `transaction`/the repo mock lacks `find`, add them: `transaction: jest.fn()` on the dataSource mock and `find: jest.fn()` on `scheduleRepo`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `nvm use 22.13.1 && pnpm nx test api -- --testPathPattern admin-schedule.service`
Expected: PASS (all `bulkCreate` tests green, existing tests still green).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin/schedule/admin-schedule.service.ts \
        apps/api/src/modules/admin/schedule/__tests__/admin-schedule.service.spec.ts
git commit -m "feat(admin-schedule): bulkCreate service — validate + insert in one transaction"
```

---

## Task 3: `POST /admin/schedule/bulk` route

**Files:**
- Modify: `apps/api/src/modules/admin/schedule/admin-schedule.controller.ts`

- [ ] **Step 1: Add the route**

Add after the existing `create` method, and import the DTOs:

```ts
import { BulkCreateResponseDto, BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
```

```ts
@Post('bulk')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({
    summary: 'Bulk-create schedule entries (copy week / copy class / recurrence)',
    description:
        'Inserts 1..200 independent entries in a single transaction. Duplicates are NOT ' +
        'checked. Fails atomically (nothing created) if any referenced coach or training ' +
        'type is inactive.',
})
@ApiResponse({ status: 201, type: BulkCreateResponseDto })
@ApiResponse({ status: 400, description: 'Empty/oversized array or inactive coach/trainingType' })
@ApiResponse({ status: 401 })
async bulkCreate(@Body() dto: BulkCreateScheduleDto): Promise<BulkCreateResponseDto> {
    return this.scheduleService.bulkCreate(dto);
}
```

> Note: place `@Post('bulk')` BEFORE the `@Get(':id')`/`@Put(':id')` param routes is not required (different HTTP verb), but keep it directly under `@Post()` for readability.

- [ ] **Step 2: Build to typecheck the controller**

Run: `nvm use 22.13.1 && pnpm nx run api:build --skip-nx-cache 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 3: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint api 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/admin/schedule/admin-schedule.controller.ts
git commit -m "feat(admin-schedule): expose POST /admin/schedule/bulk"
```

---

## Task 4: Set up vitest in the admin app

The admin app has `/// <reference types='vitest' />` in `vite.config.ts` but no `test` block and no test target yet. Add both, mirroring `libs/db`.

**Files:**
- Modify: `apps/admin/vite.config.ts`
- Create: `apps/admin/tsconfig.spec.json`
- Create: `apps/admin/src/features/schedule/bulk/iso-weekday.ts`
- Create: `apps/admin/src/features/schedule/bulk/iso-weekday.spec.ts`

- [ ] **Step 1: Add the `test` block to `apps/admin/vite.config.ts`**

Inside the object returned by `defineConfig(() => ({ ... }))`, add a `test` property (sibling of `build`):

```ts
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.spec.ts'],
        passWithNoTests: true,
    },
```

- [ ] **Step 2: Create `apps/admin/tsconfig.spec.json`**

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "outDir": "../../dist/out-tsc",
        "module": "commonjs",
        "types": ["node", "vitest/globals"]
    },
    "include": ["vite.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts", "src/**/*.d.ts"]
}
```

- [ ] **Step 3: Write the shared helper + its test (proves the harness works)**

`apps/admin/src/features/schedule/bulk/iso-weekday.ts`:

```ts
/** ISO weekday: 1 = Monday … 7 = Sunday (Russian Monday-first week). */
export function isoWeekday(date: Date): number {
    return ((date.getDay() + 6) % 7) + 1;
}
```

`apps/admin/src/features/schedule/bulk/iso-weekday.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isoWeekday } from './iso-weekday';

describe('isoWeekday', () => {
    it('maps Monday to 1 and Sunday to 7', () => {
        expect(isoWeekday(new Date(2026, 5, 8))).toBe(1); // 2026-06-08 is a Monday
        expect(isoWeekday(new Date(2026, 5, 14))).toBe(7); // 2026-06-14 is a Sunday
    });
});
```

- [ ] **Step 4: Run the admin tests**

Run: `nvm use 22.13.1 && pnpm nx test admin`
Expected: PASS (1 file, 1 test). If `nx test admin` reports "target not found", run directly: `npx vitest run --config apps/admin/vite.config.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/vite.config.ts apps/admin/tsconfig.spec.json \
        apps/admin/src/features/schedule/bulk/iso-weekday.ts \
        apps/admin/src/features/schedule/bulk/iso-weekday.spec.ts
git commit -m "test(admin): set up vitest + isoWeekday helper for bulk schedule"
```

---

## Task 5: `buildRecurrence` pure function

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/build-recurrence.ts`
- Test: `apps/admin/src/features/schedule/bulk/build-recurrence.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { buildRecurrence } from './build-recurrence';

const base = { trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60, time: '18:30' };

describe('buildRecurrence', () => {
    it('creates one entry per matching weekday inside a date range (inclusive)', () => {
        // 2026-06-08 (Mon) … 2026-06-21 (Sun): Mon/Wed/Fri over two weeks = 6 entries.
        const result = buildRecurrence({
            ...base,
            weekdays: [1, 3, 5],
            range: { mode: 'dates', from: new Date(2026, 5, 8), to: new Date(2026, 5, 21) },
        });
        expect(result).toHaveLength(6);
        // Every entry carries the form fields and an ISO startTime at local 18:30.
        for (const e of result) {
            expect(e).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60 });
            const d = new Date(e.startTime);
            expect(d.getHours()).toBe(18);
            expect(d.getMinutes()).toBe(30);
            expect([1, 3, 5]).toContain(((d.getDay() + 6) % 7) + 1);
        }
    });

    it('supports "N weeks" mode: from a start date for N*7 days', () => {
        // Start Mon 2026-06-08, 2 weeks → Mon/Wed/Fri x2 = 6 entries.
        const result = buildRecurrence({
            ...base,
            weekdays: [1, 3, 5],
            range: { mode: 'weeks', from: new Date(2026, 5, 8), weeks: 2 },
        });
        expect(result).toHaveLength(6);
    });

    it('returns empty when no weekday matches', () => {
        const result = buildRecurrence({
            ...base,
            weekdays: [7], // Sunday only
            range: { mode: 'dates', from: new Date(2026, 5, 8), to: new Date(2026, 5, 10) }, // Mon–Wed
        });
        expect(result).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-recurrence`
Expected: FAIL — cannot find module `./build-recurrence`.

- [ ] **Step 3: Implement**

```ts
import type { IScheduleFormPayload } from '@/shared/api';
import { addDays, differenceInCalendarDays, set } from 'date-fns';

import { isoWeekday } from './iso-weekday';

export type TRecurrenceRange =
    | { mode: 'dates'; from: Date; to: Date }
    | { mode: 'weeks'; from: Date; weeks: number };

export interface IBuildRecurrenceParams {
    trainingTypeId: string;
    coachId: string;
    durationMinutes: number;
    time: string; // "HH:mm"
    weekdays: number[]; // ISO 1=Mon..7=Sun
    range: TRecurrenceRange;
}

function rangeEnd(range: TRecurrenceRange): Date {
    return range.mode === 'dates' ? range.to : addDays(range.from, range.weeks * 7 - 1);
}

export function buildRecurrence(params: IBuildRecurrenceParams): IScheduleFormPayload[] {
    const { trainingTypeId, coachId, durationMinutes, time, weekdays, range } = params;
    const [hours, minutes] = time.split(':').map(Number);
    const end = rangeEnd(range);
    const totalDays = differenceInCalendarDays(end, range.from);

    const out: IScheduleFormPayload[] = [];
    for (let i = 0; i <= totalDays; i += 1) {
        const day = addDays(range.from, i);
        if (!weekdays.includes(isoWeekday(day))) continue;
        const startTime = set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
        out.push({ trainingTypeId, coachId, durationMinutes, startTime: startTime.toISOString() });
    }
    return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-recurrence`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/build-recurrence.ts \
        apps/admin/src/features/schedule/bulk/build-recurrence.spec.ts
git commit -m "feat(admin-schedule): buildRecurrence date generator + tests"
```

---

## Task 6: `buildWeekCopy` pure function

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/build-week-copy.ts`
- Test: `apps/admin/src/features/schedule/bulk/build-week-copy.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { buildWeekCopy } from './build-week-copy';

const item = (over: Partial<IAdminScheduleItem>): IAdminScheduleItem => ({
    id: 'x', startTime: '2026-06-08T15:00:00.000Z', durationMinutes: 60, status: 'scheduled',
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
    ...over,
});

describe('buildWeekCopy', () => {
    const sourceWeek = new Date(2026, 5, 8); // Mon 2026-06-08
    const targetWeek = new Date(2026, 5, 15); // Mon 2026-06-15 (+1 week)

    it('shifts each scheduled item by the whole-week delta, preserving weekday and time', () => {
        const src = [item({ id: 'a', startTime: '2026-06-08T15:00:00.000Z' })];
        const result = buildWeekCopy(src, sourceWeek, targetWeek);
        expect(result).toHaveLength(1);
        const d = new Date(result[0].startTime);
        expect(d.getDate()).toBe(15); // +7 days
        expect(d.getHours()).toBe(new Date('2026-06-08T15:00:00.000Z').getHours());
        expect(result[0]).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 60 });
    });

    it('skips cancelled classes', () => {
        const src = [item({ id: 'a' }), item({ id: 'b', status: 'cancelled' })];
        expect(buildWeekCopy(src, sourceWeek, targetWeek)).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-week-copy`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
import type { IAdminScheduleItem, IScheduleFormPayload } from '@/shared/api';
import { addWeeks, differenceInCalendarWeeks, parseISO } from 'date-fns';

export function buildWeekCopy(
    items: IAdminScheduleItem[],
    sourceWeekStart: Date,
    targetWeekStart: Date,
): IScheduleFormPayload[] {
    const weekDelta = differenceInCalendarWeeks(targetWeekStart, sourceWeekStart, { weekStartsOn: 1 });
    return items
        .filter((it) => it.status === 'scheduled')
        .map((it) => ({
            trainingTypeId: it.trainingType.id,
            coachId: it.coach.id,
            durationMinutes: it.durationMinutes,
            startTime: addWeeks(parseISO(it.startTime), weekDelta).toISOString(),
        }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-week-copy`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/build-week-copy.ts \
        apps/admin/src/features/schedule/bulk/build-week-copy.spec.ts
git commit -m "feat(admin-schedule): buildWeekCopy shift generator + tests"
```

---

## Task 7: `buildDuplicate` pure function

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/build-duplicate.ts`
- Test: `apps/admin/src/features/schedule/bulk/build-duplicate.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { buildDuplicate } from './build-duplicate';

const source: IAdminScheduleItem = {
    id: 'x', startTime: '2026-06-08T15:00:00.000Z', durationMinutes: 45, status: 'scheduled',
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
};

describe('buildDuplicate', () => {
    it('copies the class to each target date, keeping its time of day', () => {
        const result = buildDuplicate(source, [new Date(2026, 5, 10), new Date(2026, 5, 12)]);
        expect(result).toHaveLength(2);
        for (const e of result) {
            expect(e).toMatchObject({ trainingTypeId: 't1', coachId: 'c1', durationMinutes: 45 });
            const d = new Date(e.startTime);
            expect(d.getHours()).toBe(new Date('2026-06-08T15:00:00.000Z').getHours());
            expect(d.getMinutes()).toBe(0);
        }
        expect(new Date(result[0].startTime).getDate()).toBe(10);
        expect(new Date(result[1].startTime).getDate()).toBe(12);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-duplicate`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
import type { IAdminScheduleItem, IScheduleFormPayload } from '@/shared/api';
import { parseISO, set } from 'date-fns';

export function buildDuplicate(source: IAdminScheduleItem, targetDates: Date[]): IScheduleFormPayload[] {
    const srcTime = parseISO(source.startTime);
    return targetDates.map((date) => ({
        trainingTypeId: source.trainingType.id,
        coachId: source.coach.id,
        durationMinutes: source.durationMinutes,
        startTime: set(date, {
            hours: srcTime.getHours(),
            minutes: srcTime.getMinutes(),
            seconds: 0,
            milliseconds: 0,
        }).toISOString(),
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22.13.1 && pnpm nx test admin -- build-duplicate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/build-duplicate.ts \
        apps/admin/src/features/schedule/bulk/build-duplicate.spec.ts
git commit -m "feat(admin-schedule): buildDuplicate copy generator + tests"
```

---

## Task 8: `findOverlappingIds` pure function

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/find-overlapping-ids.ts`
- Test: `apps/admin/src/features/schedule/bulk/find-overlapping-ids.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { findOverlappingIds } from './find-overlapping-ids';

const it_ = (id: string, startTime: string, status: 'scheduled' | 'cancelled' = 'scheduled'): IAdminScheduleItem => ({
    id, startTime, durationMinutes: 60, status, cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
});

describe('findOverlappingIds', () => {
    it('flags 2+ scheduled classes that share the exact start time', () => {
        const result = findOverlappingIds([
            it_('a', '2026-06-08T15:00:00.000Z'),
            it_('b', '2026-06-08T15:00:00.000Z'),
            it_('c', '2026-06-08T16:00:00.000Z'),
        ]);
        expect(result).toEqual(new Set(['a', 'b']));
    });

    it('ignores cancelled classes', () => {
        const result = findOverlappingIds([
            it_('a', '2026-06-08T15:00:00.000Z'),
            it_('b', '2026-06-08T15:00:00.000Z', 'cancelled'),
        ]);
        expect(result.size).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `nvm use 22.13.1 && pnpm nx test admin -- find-overlapping-ids`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```ts
import type { IAdminScheduleItem } from '@/shared/api';

/** Ids of scheduled classes that share an exact start time with another scheduled class. */
export function findOverlappingIds(items: IAdminScheduleItem[]): Set<string> {
    const byStart = new Map<string, string[]>();
    for (const it of items) {
        if (it.status !== 'scheduled') continue;
        const key = new Date(it.startTime).getTime().toString();
        const ids = byStart.get(key) ?? [];
        ids.push(it.id);
        byStart.set(key, ids);
    }
    const result = new Set<string>();
    for (const ids of byStart.values()) {
        if (ids.length >= 2) ids.forEach((id) => result.add(id));
    }
    return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `nvm use 22.13.1 && pnpm nx test admin -- find-overlapping-ids`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/find-overlapping-ids.ts \
        apps/admin/src/features/schedule/bulk/find-overlapping-ids.spec.ts
git commit -m "feat(admin-schedule): findOverlappingIds for same-slot detection + tests"
```

---

## Task 9: `bulkCreate` in the API client

**Files:**
- Modify: `apps/admin/src/shared/api/schedule.api.ts`

- [ ] **Step 1: Add the response type + method**

After `IAdminScheduleListResponse`, add:

```ts
export interface IBulkCreateResponse {
    created: number;
    items: IAdminScheduleItem[];
}
```

Inside the `adminScheduleApi` object, add (after `create`):

```ts
    bulkCreate: (entries: IScheduleFormPayload[]): Promise<IBulkCreateResponse> =>
        adminApiClient.post<IBulkCreateResponse>('/admin/schedule/bulk', { entries }),
```

- [ ] **Step 2: Confirm the symbol is exported from the barrel**

Check `apps/admin/src/shared/api/index.ts` re-exports `schedule.api` types (it already exports `IAdminScheduleItem` etc.). If it uses `export * from './schedule.api'`, nothing to do; otherwise add `IBulkCreateResponse`.

- [ ] **Step 3: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/shared/api/schedule.api.ts apps/admin/src/shared/api/index.ts
git commit -m "feat(admin-schedule): adminScheduleApi.bulkCreate client"
```

---

## Task 10: Red outline for same-slot classes in the calendar

**Files:**
- Modify: `apps/admin/src/features/schedule/ScheduleCalendar.tsx`

- [ ] **Step 1: Compute overlaps and apply the outline class**

At the top of the component body (after `const days = ...`), add:

```tsx
const overlappingIds = findOverlappingIds(items);
```

Add the import:

```tsx
import { findOverlappingIds } from './bulk/find-overlapping-ids';
```

In the `dayItems.map((item) => { ... })` block, compute `const isOverlapping = overlappingIds.has(item.id);` and append a red ring to the button's className when true (keep existing cancelled/scheduled styling):

```tsx
className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors ${
    isCancelled
        ? 'bg-error/10 text-error hover:bg-error/20 line-through'
        : 'bg-primary/10 text-primary hover:bg-primary/20'
}${isOverlapping ? ' ring-2 ring-error ring-offset-1' : ''}`}
title={isOverlapping ? 'Несколько занятий в одно время' : undefined}
```

- [ ] **Step 2: Typecheck/lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run the admin (`pnpm nx serve admin`), create two classes at the same date+time, switch to calendar view, confirm both show a red outline and a tooltip; a single class does not.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/features/schedule/ScheduleCalendar.tsx
git commit -m "feat(admin-schedule): red outline on same-slot classes"
```

---

## Task 11: Shared `BulkPreview` footer component

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/BulkPreview.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { IScheduleFormPayload } from '@/shared/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IBulkPreviewProps {
    entries: IScheduleFormPayload[];
    submitting: boolean;
    error: string | null;
    onConfirm: () => void;
    onCancel: () => void;
}

export function BulkPreview({ entries, submitting, error, onConfirm, onCancel }: IBulkPreviewProps) {
    const count = entries.length;
    return (
        <div className="mt-4 space-y-3">
            <div className="rounded-md border border-border bg-surface p-2 max-h-40 overflow-y-auto text-xs text-body-secondary">
                {count === 0 ? (
                    <p className="text-center py-2">Нет занятий для создания</p>
                ) : (
                    entries.slice(0, 50).map((e, i) => (
                        <div key={`${e.startTime}-${i}`} className="flex justify-between py-0.5">
                            <span>{format(parseISO(e.startTime), 'EEE, d MMM HH:mm', { locale: ru })}</span>
                        </div>
                    ))
                )}
                {count > 50 && <p className="text-center pt-1">…и ещё {count - 50}</p>}
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex items-center justify-between">
                <span className="text-body-secondary text-sm">Будет создано: {count}</span>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={count === 0 || submitting}
                        className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-accent-active disabled:opacity-50"
                    >
                        {submitting ? 'Создаю…' : 'Создать'}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/BulkPreview.tsx
git commit -m "feat(admin-schedule): BulkPreview confirm footer"
```

---

## Task 12: `RecurrenceDialog`

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/RecurrenceDialog.tsx`

The dialog receives coach + training-type options as props (`{ id, name }[]`). The page (Task 15) loads them via `adminCoachesApi.getOptions()` / `adminTrainingTypesApi.getOptions()` — both already return `ICoachOption[]` / `ITrainingTypeOption[]` shaped `{ id: string; name: string }`, exactly matching the dialog's `IOption`. (This mirrors how `ScheduleForm.tsx` loads its dropdowns.)

- [ ] **Step 1: Write the component**

```tsx
import { adminScheduleApi, type IScheduleFormPayload } from '@/shared/api';
import { useState } from 'react';

import { buildRecurrence, type TRecurrenceRange } from './build-recurrence';
import { BulkPreview } from './BulkPreview';

interface IOption { id: string; name: string }
interface IRecurrenceDialogProps {
    coaches: IOption[];
    trainingTypes: IOption[];
    onClose: () => void;
    onCreated: (count: number) => void;
}

const WEEKDAYS: Array<{ iso: number; label: string }> = [
    { iso: 1, label: 'Пн' }, { iso: 2, label: 'Вт' }, { iso: 3, label: 'Ср' },
    { iso: 4, label: 'Чт' }, { iso: 5, label: 'Пт' }, { iso: 6, label: 'Сб' }, { iso: 7, label: 'Вс' },
];
const DURATIONS = [30, 45, 60, 90] as const;

export function RecurrenceDialog({ coaches, trainingTypes, onClose, onCreated }: IRecurrenceDialogProps) {
    const [trainingTypeId, setTrainingTypeId] = useState(trainingTypes[0]?.id ?? '');
    const [coachId, setCoachId] = useState(coaches[0]?.id ?? '');
    const [durationMinutes, setDurationMinutes] = useState<number>(60);
    const [time, setTime] = useState('18:30');
    const [weekdays, setWeekdays] = useState<number[]>([]);
    const [mode, setMode] = useState<'dates' | 'weeks'>('weeks');
    const [from, setFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [weeks, setWeeks] = useState<number>(4);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleDay = (iso: number) =>
        setWeekdays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]));

    const range: TRecurrenceRange =
        mode === 'dates'
            ? { mode: 'dates', from: new Date(`${from}T00:00:00`), to: new Date(`${to}T00:00:00`) }
            : { mode: 'weeks', from: new Date(`${from}T00:00:00`), weeks };

    const entries: IScheduleFormPayload[] =
        trainingTypeId && coachId && weekdays.length > 0
            ? buildRecurrence({ trainingTypeId, coachId, durationMinutes, time, weekdays, range })
            : [];

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await adminScheduleApi.bulkCreate(entries);
            onCreated(res.created);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось создать занятия');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
                <h3 className="heading-3 mb-4">Повторяющееся занятие</h3>

                <label className="text-body mb-1 block">Тип занятия</label>
                <select className="w-full rounded border border-border bg-surface p-2 mb-3" value={trainingTypeId} onChange={(e) => setTrainingTypeId(e.target.value)}>
                    {trainingTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>

                <label className="text-body mb-1 block">Тренер</label>
                <select className="w-full rounded border border-border bg-surface p-2 mb-3" value={coachId} onChange={(e) => setCoachId(e.target.value)}>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex gap-3 mb-3">
                    <div className="flex-1">
                        <label className="text-body mb-1 block">Время</label>
                        <input type="time" className="w-full rounded border border-border bg-surface p-2" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                    <div className="flex-1">
                        <label className="text-body mb-1 block">Длительность</label>
                        <select className="w-full rounded border border-border bg-surface p-2" value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))}>
                            {DURATIONS.map((d) => <option key={d} value={d}>{d} мин</option>)}
                        </select>
                    </div>
                </div>

                <label className="text-body mb-1 block">Дни недели</label>
                <div className="flex gap-1 mb-3">
                    {WEEKDAYS.map((d) => (
                        <button key={d.iso} type="button" onClick={() => toggleDay(d.iso)}
                            className={`flex-1 rounded-md py-1.5 text-sm ${weekdays.includes(d.iso) ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>
                            {d.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 mb-3">
                    <button type="button" onClick={() => setMode('weeks')} className={`flex-1 rounded-md py-1.5 text-sm ${mode === 'weeks' ? 'bg-primary/10 text-primary font-medium' : 'border border-border'}`}>N недель</button>
                    <button type="button" onClick={() => setMode('dates')} className={`flex-1 rounded-md py-1.5 text-sm ${mode === 'dates' ? 'bg-primary/10 text-primary font-medium' : 'border border-border'}`}>Диапазон дат</button>
                </div>

                <div className="flex gap-3 mb-1">
                    <div className="flex-1">
                        <label className="text-body mb-1 block">С даты</label>
                        <input type="date" className="w-full rounded border border-border bg-surface p-2" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    {mode === 'dates' ? (
                        <div className="flex-1">
                            <label className="text-body mb-1 block">По дату</label>
                            <input type="date" className="w-full rounded border border-border bg-surface p-2" value={to} onChange={(e) => setTo(e.target.value)} />
                        </div>
                    ) : (
                        <div className="flex-1">
                            <label className="text-body mb-1 block">Недель</label>
                            <input type="number" min={1} max={52} className="w-full rounded border border-border bg-surface p-2" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} />
                        </div>
                    )}
                </div>

                <BulkPreview entries={entries} submitting={submitting} error={error} onConfirm={handleConfirm} onCancel={onClose} />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/RecurrenceDialog.tsx
git commit -m "feat(admin-schedule): RecurrenceDialog"
```

---

## Task 13: `CopyWeekDialog`

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/CopyWeekDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { adminScheduleApi, type IAdminScheduleItem, type IScheduleFormPayload } from '@/shared/api';
import { format, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

import { buildWeekCopy } from './build-week-copy';
import { BulkPreview } from './BulkPreview';

interface ICopyWeekDialogProps {
    items: IAdminScheduleItem[]; // the source week's items (already loaded in the page)
    sourceWeekStart: Date;
    onClose: () => void;
    onCreated: (count: number) => void;
}

export function CopyWeekDialog({ items, sourceWeekStart, onClose, onCreated }: ICopyWeekDialogProps) {
    const [targetDate, setTargetDate] = useState<string>(() => format(sourceWeekStart, 'yyyy-MM-dd'));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const targetWeekStart = startOfWeek(new Date(`${targetDate}T00:00:00`), { weekStartsOn: 1 });
    const entries: IScheduleFormPayload[] = buildWeekCopy(items, sourceWeekStart, targetWeekStart);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await adminScheduleApi.bulkCreate(entries);
            onCreated(res.created);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось скопировать неделю');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                <h3 className="heading-3 mb-2">Копировать неделю</h3>
                <p className="text-body-secondary mb-4 text-sm">
                    Копируется {items.filter((i) => i.status === 'scheduled').length} активных занятий недели
                    {' '}{format(sourceWeekStart, 'd MMM', { locale: ru })}.
                </p>
                <label className="text-body mb-1 block">Целевая неделя (любой день в ней)</label>
                <input type="date" className="w-full rounded border border-border bg-surface p-2" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                <BulkPreview entries={entries} submitting={submitting} error={error} onConfirm={handleConfirm} onCancel={onClose} />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/CopyWeekDialog.tsx
git commit -m "feat(admin-schedule): CopyWeekDialog"
```

---

## Task 14: `DuplicateClassDialog`

**Files:**
- Create: `apps/admin/src/features/schedule/bulk/DuplicateClassDialog.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { adminScheduleApi, type IAdminScheduleItem, type IScheduleFormPayload } from '@/shared/api';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';

import { buildDuplicate } from './build-duplicate';
import { BulkPreview } from './BulkPreview';

interface IDuplicateClassDialogProps {
    source: IAdminScheduleItem;
    onClose: () => void;
    onCreated: (count: number) => void;
}

export function DuplicateClassDialog({ source, onClose, onCreated }: IDuplicateClassDialogProps) {
    const [dates, setDates] = useState<string[]>([]);
    const [draft, setDraft] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addDate = () => {
        if (draft && !dates.includes(draft)) setDates((prev) => [...prev, draft]);
        setDraft('');
    };
    const removeDate = (d: string) => setDates((prev) => prev.filter((x) => x !== d));

    const entries: IScheduleFormPayload[] = buildDuplicate(
        source,
        dates.map((d) => new Date(`${d}T00:00:00`)),
    );

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await adminScheduleApi.bulkCreate(entries);
            onCreated(res.created);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось скопировать занятие');
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                <h3 className="heading-3 mb-2">Копировать занятие</h3>
                <p className="text-body-secondary mb-4 text-sm">
                    {source.trainingType.name} · {source.coach.name} · {format(parseISO(source.startTime), 'HH:mm')} ({source.durationMinutes} мин)
                </p>
                <label className="text-body mb-1 block">Добавить дату</label>
                <div className="flex gap-2 mb-2">
                    <input type="date" className="flex-1 rounded border border-border bg-surface p-2" value={draft} onChange={(e) => setDraft(e.target.value)} />
                    <button type="button" onClick={addDate} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Добавить</button>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                    {dates.map((d) => (
                        <button key={d} type="button" onClick={() => removeDate(d)} className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs hover:bg-error/10 hover:text-error">
                            {format(new Date(`${d}T00:00:00`), 'd MMM', { locale: ru })} ✕
                        </button>
                    ))}
                </div>
                <BulkPreview entries={entries} submitting={submitting} error={error} onConfirm={handleConfirm} onCancel={onClose} />
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Lint**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/features/schedule/bulk/DuplicateClassDialog.tsx
git commit -m "feat(admin-schedule): DuplicateClassDialog"
```

---

## Task 15: Wire into the schedule page (toolbar + class action + refetch)

**Files:**
- Modify: `apps/admin/src/pages/DashboardPage.tsx`
- Modify: `apps/admin/src/features/schedule/ScheduleCalendar.tsx` (pass a duplicate handler)

The page already owns `rangeStart`, `items`, and the data `useEffect`. Add: a `reloadToken` to force refetch after a bulk create, the coach/type options for the recurrence dialog (fetch them the same way `ScheduleForm.tsx` does), modal open-state, toolbar buttons, and a toast.

- [ ] **Step 1: Add refetch token + dialog state to `DashboardPage`**

Add state near the other `useState` calls:

```tsx
const [reloadToken, setReloadToken] = useState(0);
const [recurrenceOpen, setRecurrenceOpen] = useState(false);
const [copyWeekOpen, setCopyWeekOpen] = useState(false);
const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
const [trainingTypes, setTrainingTypes] = useState<{ id: string; name: string }[]>([]);
const [toast, setToast] = useState<string | null>(null);
```

Add `reloadToken` to the data `useEffect` dependency array: `}, [rangeStart, status, reloadToken]);`.

Load coach/type options once (same calls `ScheduleForm.tsx` uses — `getOptions()` already returns `{ id, name }[]`):

```tsx
useEffect(() => {
    Promise.all([adminCoachesApi.getOptions(), adminTrainingTypesApi.getOptions()])
        .then(([cs, ts]) => {
            setCoaches(cs);
            setTrainingTypes(ts);
        })
        .catch(() => undefined);
}, []);
```

Add a handler:

```tsx
const onCreated = (count: number): void => {
    setReloadToken((t) => t + 1);
    setToast(`Создано занятий: ${count}`);
    setTimeout(() => setToast(null), 3000);
};
```

- [ ] **Step 2: Add toolbar buttons + render dialogs**

Next to the existing "Добавить занятие" `Link` in the header, add two buttons:

```tsx
<button type="button" onClick={() => setRecurrenceOpen(true)}
    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
    Повторяющееся
</button>
<button type="button" onClick={() => setCopyWeekOpen(true)} disabled={items.length === 0}
    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
    Копировать неделю
</button>
```

Before the closing `</div>` of the page root, render the dialogs + toast:

```tsx
{recurrenceOpen && (
    <RecurrenceDialog coaches={coaches} trainingTypes={trainingTypes}
        onClose={() => setRecurrenceOpen(false)} onCreated={onCreated} />
)}
{copyWeekOpen && (
    <CopyWeekDialog items={items} sourceWeekStart={rangeStart}
        onClose={() => setCopyWeekOpen(false)} onCreated={onCreated} />
)}
{toast && (
    <div className="fixed bottom-4 right-4 z-50 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg">
        {toast}
    </div>
)}
```

Add imports:

```tsx
import { RecurrenceDialog } from '@/features/schedule/bulk/RecurrenceDialog';
import { CopyWeekDialog } from '@/features/schedule/bulk/CopyWeekDialog';
import { adminCoachesApi, adminTrainingTypesApi } from '@/shared/api';
```

- [ ] **Step 3: Add the "Копировать" action on a class (duplicate)**

The calendar cell currently navigates to edit on click. Add a small "копировать" affordance. Simplest non-invasive approach: handle duplicate from the **edit page** instead of the cell to avoid touching click semantics — OR add a second button. For this plan, add a duplicate button on the existing `ScheduleEditPage.tsx` toolbar (it already loads the single `IAdminScheduleItem`):

In `apps/admin/src/pages/ScheduleEditPage.tsx`, add state `const [dupOpen, setDupOpen] = useState(false);`, a "Копировать" button, and render `{dupOpen && item && <DuplicateClassDialog source={item} onClose={() => setDupOpen(false)} onCreated={() => { setDupOpen(false); /* optional toast/nav */ }} />}`. Use the page's existing loaded entry variable name in place of `item`.

- [ ] **Step 4: Lint + typecheck**

Run: `nvm use 22.13.1 && pnpm nx lint admin 2>&1 | tail -5`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run `pnpm nx serve admin` against the live API (or local). Verify: «Повторяющееся» creates Mon/Wed/Fri classes; «Копировать неделю» duplicates onto the chosen week; duplicate from edit page copies to chosen dates; new classes appear after each (refetch); same-slot classes show the red outline.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/pages/DashboardPage.tsx apps/admin/src/pages/ScheduleEditPage.tsx \
        apps/admin/src/features/schedule/ScheduleCalendar.tsx
git commit -m "feat(admin-schedule): wire bulk dialogs + refetch into schedule page"
```

---

## Task 16: Full test + lint sweep

- [ ] **Step 1: Backend tests**

Run: `nvm use 22.13.1 && pnpm nx test api`
Expected: PASS.

- [ ] **Step 2: Frontend tests**

Run: `nvm use 22.13.1 && pnpm nx test admin`
Expected: PASS (5 spec files: iso-weekday, build-recurrence, build-week-copy, build-duplicate, find-overlapping-ids).

- [ ] **Step 3: Lint both**

Run: `nvm use 22.13.1 && pnpm nx lint api && pnpm nx lint admin`
Expected: no errors.

- [ ] **Step 4: Build both**

Run: `nvm use 22.13.1 && pnpm nx run api:build && pnpm nx run admin:build`
Expected: success.

---

## Deploy (after merge to develop)

Per `project_prod_deploy_live` memory: this touches both `api` (new endpoint) and `admin` (frontend) → rebuild **both** images, sequentially, on the VPS:

```bash
git archive develop | ssh root@45.38.249.222 'tar -x -C /opt/fit-calendar'
ssh root@45.38.249.222 'cd /opt/fit-calendar && docker compose --env-file .env.prod -f docker/docker-compose.prod.yml build api && docker compose --env-file .env.prod -f docker/docker-compose.prod.yml build caddy && docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d'
```

No migration runs (no schema change).
