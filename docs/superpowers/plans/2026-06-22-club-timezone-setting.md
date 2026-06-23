# Club Timezone Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the club's timezone a single configurable setting (`ClubInfo.timezone`) and render every class time — bot, push notifications, day-bucketing, mini-app, and admin — in that zone regardless of server or device timezone.

**Architecture:** `ClubInfo.timezone` (IANA string, default `Europe/Moscow`) is the single source of truth, edited via an admin dropdown of Russian zones. The backend reads it (`ClubService.getTimeZone()`) for schedule day-bucketing, the bot, and push copy. `@fitcalendar/shared` gains the curated zone list + a `formatInClubTz` helper (date-fns-tz) used by both frontends. The stop-gap container `TZ` env var is reverted so nothing competes with the DB setting.

**Tech Stack:** NestJS + TypeORM (apps/api), grammy + libs/bot-core, React + Vite (apps/admin, apps/mini-app), date-fns + date-fns-tz, jest (api, bot-core), vitest (shared).

**Environment note:** nx requires Node 22 — run `source ~/.nvm/nvm.sh && nvm use 22.13.1` before any `npx nx ...` command. Commit with the pre-commit hook (no `--no-verify`); stage by explicit path.

---

## File Structure

**Phase 1 — Foundation (shared + DB)**
- Create: `libs/shared/src/consts/time-zones.const.ts` — zone list, ids, default, `isKnownTimeZone`.
- Create: `libs/shared/src/consts/time-zones.const.spec.ts` — vitest.
- Create: `libs/shared/src/utils/club-tz.util.ts` — `formatInClubTz`.
- Create: `libs/shared/src/utils/club-tz.util.spec.ts` — vitest.
- Modify: `libs/shared/src/consts/index.ts`, `libs/shared/src/utils/index.ts` — barrels.
- Modify: `package.json` — add `date-fns-tz`.
- Modify: `libs/db/src/entities/club-info.entity.ts` — `timezone` column.
- Create: `libs/db/src/migrations/1781000000000-AddClubTimezone.ts`.

**Phase 2 — Backend consumers**
- Modify: `apps/api/src/modules/club/club.service.ts` — `getTimeZone()`.
- Modify: `apps/api/src/modules/schedule/schedule.service.ts` + `schedule.module.ts` — TZ-aware bucketing.
- Create: `apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts`.
- Modify: `libs/bot-core/src/types.ts`, `format.ts`, `week-message.ts`, `register-schedule-commands.ts` + their specs — `timeZone` params.
- Modify: `apps/api/src/modules/bot/handlers/schedule.handler.ts`, `bot.service.ts` — pass `ClubService`.
- Modify: `apps/bot/src/commands/schedule.command.ts` — HTTP `getTimeZone`.
- Modify: `apps/api/src/modules/reminder/notification-format.ts` + spec — `timeZone` param.
- Modify: `apps/api/src/modules/reminder/reminder-dispatcher.service.ts`, `listeners/schedule-notification.listener.ts`, `reminder.module.ts` — inject `ClubService`.

**Phase 3 — Admin API + form**
- Modify: `apps/api/src/modules/admin/club/dto/update-club-info.dto.ts` + spec — `timezone` validated.
- Modify: `apps/api/src/modules/admin/club/dto/club-info.dto.ts`, `admin-club.service.ts`.
- Modify: `apps/api/src/modules/club/dto/club-info.dto.ts`, `club.service.ts` — expose `timezone` publicly.
- Modify: `apps/admin/src/shared/api/club.api.ts`, `apps/admin/src/pages/ClubInfoPage.tsx` — dropdown.

**Phase 4 — Frontend rendering**
- Modify: `apps/mini-app/src/shared/api/club.api.ts` — `timezone` field.
- Create: `apps/mini-app/src/shared/club-timezone.tsx` — context + hook.
- Modify: mini-app instant call sites (ClassCard, ClassDetailPage, RemindersPage, CoachSchedulePage).
- Create: `apps/admin/src/shared/club-timezone.tsx` — context + hook.
- Modify: admin instant call sites (ScheduleList, ScheduleCalendar, MoveClassConfirm, BulkPreview, DuplicateClassDialog).

**Phase 5 — Revert container TZ**
- Modify: `docker/docker-compose.prod.yml` — remove the `TZ` env block.

---

## Phase 1 — Foundation

### Task 1: Add date-fns-tz dependency

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install date-fns-tz (v3 is compatible with date-fns v4)**

Run (from repo root, Node 22 active):
```bash
source ~/.nvm/nvm.sh && nvm use 22.13.1
pnpm add date-fns-tz@^3.2.0 -w
```
Expected: `package.json` gains `"date-fns-tz": "^3.2.0"` under dependencies; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Verify it resolves**

Run:
```bash
node -e "const {formatInTimeZone}=require('date-fns-tz'); console.log(formatInTimeZone('2026-06-22T06:00:00Z','Europe/Moscow','HH:mm'))"
```
Expected: `09:00`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add date-fns-tz for club-timezone formatting"
```

---

### Task 2: Russian timezone constants in @fitcalendar/shared

**Files:**
- Create: `libs/shared/src/consts/time-zones.const.ts`
- Create: `libs/shared/src/consts/time-zones.const.spec.ts`
- Modify: `libs/shared/src/consts/index.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/consts/time-zones.const.spec.ts`:
```ts
import { DEFAULT_TIME_ZONE, isKnownTimeZone, RUSSIA_TIME_ZONES, RUSSIA_TIME_ZONE_IDS } from './time-zones.const';

describe('Russia time zones', () => {
    it('defaults to Moscow', () => {
        expect(DEFAULT_TIME_ZONE).toBe('Europe/Moscow');
    });

    it('lists 11 zones from Kaliningrad to Kamchatka', () => {
        expect(RUSSIA_TIME_ZONES).toHaveLength(11);
        expect(RUSSIA_TIME_ZONE_IDS[0]).toBe('Europe/Kaliningrad');
        expect(RUSSIA_TIME_ZONE_IDS).toContain('Europe/Moscow');
        expect(RUSSIA_TIME_ZONE_IDS).toContain('Asia/Kamchatka');
    });

    it('every zone has a non-empty Russian label', () => {
        for (const z of RUSSIA_TIME_ZONES) expect(z.label.length).toBeGreaterThan(0);
    });

    it('recognises known ids and rejects junk', () => {
        expect(isKnownTimeZone('Asia/Yekaterinburg')).toBe(true);
        expect(isKnownTimeZone('Mars/Olympus')).toBe(false);
        expect(isKnownTimeZone('')).toBe(false);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22.13.1 && npx nx test shared`
Expected: FAIL — cannot find module `./time-zones.const`.

- [ ] **Step 3: Write the implementation**

Create `libs/shared/src/consts/time-zones.const.ts`:
```ts
/** App-wide fallback when a club has no timezone set yet. */
export const DEFAULT_TIME_ZONE = 'Europe/Moscow';

export interface ITimeZoneOption {
    /** IANA timezone id, e.g. "Europe/Moscow". */
    id: string;
    /** Russian label for the admin dropdown. */
    label: string;
}

/** Curated list of Russian timezones (МСК−1 … МСК+9), ordered west to east. */
export const RUSSIA_TIME_ZONES: ITimeZoneOption[] = [
    { id: 'Europe/Kaliningrad', label: 'Калининград (МСК−1, UTC+2)' },
    { id: 'Europe/Moscow', label: 'Москва (МСК, UTC+3)' },
    { id: 'Europe/Samara', label: 'Самара (МСК+1, UTC+4)' },
    { id: 'Asia/Yekaterinburg', label: 'Екатеринбург (МСК+2, UTC+5)' },
    { id: 'Asia/Omsk', label: 'Омск (МСК+3, UTC+6)' },
    { id: 'Asia/Krasnoyarsk', label: 'Красноярск (МСК+4, UTC+7)' },
    { id: 'Asia/Irkutsk', label: 'Иркутск (МСК+5, UTC+8)' },
    { id: 'Asia/Yakutsk', label: 'Якутск (МСК+6, UTC+9)' },
    { id: 'Asia/Vladivostok', label: 'Владивосток (МСК+7, UTC+10)' },
    { id: 'Asia/Magadan', label: 'Магадан (МСК+8, UTC+11)' },
    { id: 'Asia/Kamchatka', label: 'Камчатка (МСК+9, UTC+12)' },
];

/** Just the IANA ids — used for validation and quick membership checks. */
export const RUSSIA_TIME_ZONE_IDS: string[] = RUSSIA_TIME_ZONES.map((z) => z.id);

/** True if `id` is one of the supported Russian zones. */
export function isKnownTimeZone(id: string): boolean {
    return RUSSIA_TIME_ZONE_IDS.includes(id);
}
```

- [ ] **Step 4: Add to the consts barrel**

In `libs/shared/src/consts/index.ts`, add (keep alphabetical-ish with the others):
```ts
export * from './time-zones.const';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx nx test shared`
Expected: PASS (the new file's 4 tests pass).

- [ ] **Step 6: Commit**

```bash
git add libs/shared/src/consts/time-zones.const.ts libs/shared/src/consts/time-zones.const.spec.ts libs/shared/src/consts/index.ts
git commit -m "feat(shared): add Russian timezone constants + isKnownTimeZone"
```

---

### Task 3: formatInClubTz helper in @fitcalendar/shared

**Files:**
- Create: `libs/shared/src/utils/club-tz.util.ts`
- Create: `libs/shared/src/utils/club-tz.util.spec.ts`
- Modify: `libs/shared/src/utils/index.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/utils/club-tz.util.spec.ts`:
```ts
import { formatInClubTz } from './club-tz.util';

const INSTANT = '2026-06-22T06:00:00Z';

describe('formatInClubTz', () => {
    it('renders HH:mm in the club zone', () => {
        expect(formatInClubTz(INSTANT, 'Europe/Moscow', 'HH:mm')).toBe('09:00');
        expect(formatInClubTz(INSTANT, 'Asia/Yekaterinburg', 'HH:mm')).toBe('11:00');
    });

    it('accepts a Date as well as an ISO string', () => {
        expect(formatInClubTz(new Date(INSTANT), 'Europe/Moscow', 'HH:mm')).toBe('09:00');
    });

    it('formats Russian month names', () => {
        expect(formatInClubTz(INSTANT, 'Europe/Moscow', 'd MMMM')).toBe('22 июня');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx nx test shared`
Expected: FAIL — cannot find module `./club-tz.util`.

- [ ] **Step 3: Write the implementation**

Create `libs/shared/src/utils/club-tz.util.ts`:
```ts
import type { Locale } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Formats an instant (ISO string or Date) at the wall-clock time of `timeZone`,
 * using date-fns format tokens. Defaults to the Russian locale so month/weekday
 * names match the rest of the app. The single client-side primitive for showing
 * club-local class times regardless of the viewer's device timezone.
 */
export function formatInClubTz(
    instant: string | Date,
    timeZone: string,
    pattern: string,
    locale: Locale = ru,
): string {
    const date = typeof instant === 'string' ? new Date(instant) : instant;
    return formatInTimeZone(date, timeZone, pattern, { locale });
}
```

- [ ] **Step 4: Add to the utils barrel**

In `libs/shared/src/utils/index.ts`, add below the existing `format-russian.util` export:
```ts
export * from './club-tz.util';
```
(`club-tz.util` has no eager side effects, so unlike `date-time.util` it is safe to barrel-export.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx nx test shared`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/shared/src/utils/club-tz.util.ts libs/shared/src/utils/club-tz.util.spec.ts libs/shared/src/utils/index.ts
git commit -m "feat(shared): add formatInClubTz helper (date-fns-tz)"
```

---

### Task 4: Add timezone column to ClubInfo entity + migration

**Files:**
- Modify: `libs/db/src/entities/club-info.entity.ts`
- Create: `libs/db/src/migrations/1781000000000-AddClubTimezone.ts`

- [ ] **Step 1: Add the column to the entity**

In `libs/db/src/entities/club-info.entity.ts`, add this column after `logoUrl` and before `updatedAt`:
```ts
    @Column({ type: 'varchar', length: 64, default: 'Europe/Moscow' })
    timezone: string;
```

- [ ] **Step 2: Write the migration**

Create `libs/db/src/migrations/1781000000000-AddClubTimezone.ts`:
```ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Club timezone becomes a setting (single source of truth for all class-time
 * rendering). Existing singleton row defaults to Europe/Moscow — the value that
 * was previously hardcoded in the bot/formatters.
 */
export class AddClubTimezone1781000000000 implements MigrationInterface {
    name = 'AddClubTimezone1781000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "club_info" ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'Europe/Moscow'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "club_info" DROP COLUMN "timezone"`);
    }
}
```

- [ ] **Step 3: Build db lib to confirm it compiles**

Run: `npx nx build db`
Expected: build succeeds (no TS errors).

- [ ] **Step 4: Commit**

```bash
git add libs/db/src/entities/club-info.entity.ts libs/db/src/migrations/1781000000000-AddClubTimezone.ts
git commit -m "feat(db): add ClubInfo.timezone column + migration"
```

---

## Phase 2 — Backend consumers

### Task 5: ClubService.getTimeZone() + public DTO field

**Files:**
- Modify: `apps/api/src/modules/club/club.service.ts`
- Modify: `apps/api/src/modules/club/dto/club-info.dto.ts`

- [ ] **Step 0: Add timezone to the public ClubInfoDto first (so the service compiles)**

In `apps/api/src/modules/club/dto/club-info.dto.ts`, add after `logoUrl`:
```ts
    @ApiProperty({ description: 'Club IANA timezone, e.g. Europe/Moscow' })
    timezone: string;
```

- [ ] **Step 1: Add the method + default**

In `apps/api/src/modules/club/club.service.ts`:

Add the import at the top:
```ts
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
```

Add `timezone: DEFAULT_TIME_ZONE,` to the `DEFAULT_STUB` object (after `logoUrl: null,`). Add `timezone: record.timezone,` to the object returned by `getInfo()` (after `logoUrl: record.logoUrl,`). Then add this method to the class:
```ts
    /**
     * The club's IANA timezone — the single source of truth for rendering class
     * times (bot, push, schedule bucketing). Falls back to the app default when
     * no club record exists yet.
     */
    async getTimeZone(): Promise<string> {
        const record = await this.clubInfoRepository.findOne({ where: {} });
        return record?.timezone ?? DEFAULT_TIME_ZONE;
    }
```
- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/club/club.service.ts apps/api/src/modules/club/dto/club-info.dto.ts
git commit -m "feat(api): expose club timezone publicly + ClubService.getTimeZone()"
```

---

### Task 6: TZ-aware ScheduleService bucketing

**Files:**
- Modify: `apps/api/src/modules/schedule/schedule.service.ts`
- Modify: `apps/api/src/modules/schedule/schedule.module.ts`
- Create: `apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts`

- [ ] **Step 1: Wire ClubModule into ScheduleModule**

In `apps/api/src/modules/schedule/schedule.module.ts`, import and add `ClubModule` to `imports`:
```ts
import { ClubModule } from '../club/club.module';
```
```ts
    imports: [TypeOrmModule.forFeature([ScheduleEntry, Coach, TrainingType]), ClubModule],
```

- [ ] **Step 2: Make bucketing timezone-aware**

In `apps/api/src/modules/schedule/schedule.service.ts`:

Replace the date-fns import line with:
```ts
import { addDays, format, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
```
Add the ClubService import:
```ts
import { ClubService } from '../club/club.service';
```
Add `ClubService` to the constructor:
```ts
    constructor(
        @InjectRepository(ScheduleEntry)
        private readonly scheduleRepository: Repository<ScheduleEntry>,
        @InjectRepository(TrainingType)
        private readonly trainingTypeRepository: Repository<TrainingType>,
        private readonly clubService: ClubService,
    ) {}
```

Replace `getToday`:
```ts
    async getToday(filter: ScheduleFilterDto = {}): Promise<ClassResponseDto[]> {
        this.logger.log('Fetching today schedule');
        const tz = await this.clubService.getTimeZone();
        // Wall-clock midnight in the club zone, expressed as the real UTC instant.
        const startLocal = startOfDay(toZonedTime(new Date(), tz));
        const start = fromZonedTime(startLocal, tz);
        const end = fromZonedTime(addDays(startLocal, 1), tz);

        return this.getByDateRange(start, end, filter);
    }
```

Replace `getByDate`:
```ts
    async getByDate(date: string, filter: ScheduleFilterDto = {}): Promise<ClassResponseDto[]> {
        this.logger.log(`Fetching schedule for date: ${date}`);
        const tz = await this.clubService.getTimeZone();
        const startLocal = startOfDay(new Date(`${date}T00:00:00`));
        const start = fromZonedTime(startLocal, tz);
        const end = fromZonedTime(addDays(startLocal, 1), tz);

        return this.getByDateRange(start, end, filter);
    }
```

Replace `getWeek`:
```ts
    async getWeek(filter: ScheduleFilterDto = {}, weekOffset = 0): Promise<WeekScheduleDto> {
        const offset = clampWeekOffset(weekOffset);
        this.logger.log(`Fetching week schedule (offset ${offset})`);
        const tz = await this.clubService.getTimeZone();
        // anchorLocal holds club wall-clock fields; format() reads them directly.
        const anchorLocal = startOfDay(addDays(toZonedTime(new Date(), tz), 7 * offset));
        const anchor = fromZonedTime(anchorLocal, tz);
        const endOfWeek = fromZonedTime(addDays(anchorLocal, 7), tz);

        const entries = await this.queryEntries(anchor, endOfWeek, filter);

        const days: DayScheduleDto[] = [];
        for (let i = 0; i < 7; i++) {
            const dateStr = format(addDays(anchorLocal, i), 'yyyy-MM-dd');

            const dayClasses = entries
                .filter((entry) => formatInClubTz(entry.startTime, tz, 'yyyy-MM-dd') === dateStr)
                .map((entry) => this.mapToDto(entry));

            days.push({ date: dateStr, classes: dayClasses });
        }

        return { days };
    }
```

Update the `@fitcalendar/shared` import to also pull `formatInClubTz`:
```ts
import { clampWeekOffset, DIFFICULTY_LEVEL_LABELS, formatInClubTz, type TDifficultyLevel } from '@fitcalendar/shared';
```

- [ ] **Step 3: Write the test**

Create `apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScheduleEntry, TrainingType } from '@fitcalendar/db';

import { ClubService } from '../../club/club.service';
import { ScheduleService } from '../schedule.service';

function makeEntry(startTime: string) {
    return {
        id: 'e1',
        startTime: new Date(startTime),
        durationMinutes: 60,
        status: 'scheduled' as const,
        coachId: 'c1',
        coach: { name: 'Анна', photoUrl: null },
        trainingType: { name: 'Йога', description: '', difficulty: 'beginner', impactTypes: [], equipment: [] },
    };
}

describe('ScheduleService (timezone bucketing)', () => {
    let service: ScheduleService;
    let find: jest.Mock;
    let getTimeZone: jest.Mock;

    beforeEach(async () => {
        find = jest.fn();
        getTimeZone = jest.fn().mockResolvedValue('Asia/Yekaterinburg'); // UTC+5
        const moduleRef = await Test.createTestingModule({
            providers: [
                ScheduleService,
                { provide: getRepositoryToken(ScheduleEntry), useValue: { find } },
                { provide: getRepositoryToken(TrainingType), useValue: { find: jest.fn() } },
                { provide: ClubService, useValue: { getTimeZone } },
            ],
        }).compile();
        service = moduleRef.get(ScheduleService);
    });

    it('buckets a class into its club-local calendar day', async () => {
        // 2026-06-22T20:00Z = 2026-06-23 01:00 in Yekaterinburg (+5) → next day.
        find.mockResolvedValue([makeEntry('2026-06-22T20:00:00Z')]);
        const { days } = await service.getWeek({}, 0);
        const dayWithClass = days.find((d) => d.classes.length > 0);
        expect(dayWithClass?.classes[0]?.startTime).toBe('2026-06-22T20:00:00.000Z');
        // The bucket date is the Yekaterinburg calendar day, not the UTC day.
        expect(dayWithClass?.date).toBe('2026-06-23');
    });
});
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx nx test api --testPathPattern schedule.service`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/schedule.service.ts apps/api/src/modules/schedule/schedule.module.ts apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts
git commit -m "feat(api): bucket schedule days in the club timezone"
```

---

### Task 7: bot-core format.ts takes a timeZone param

**Files:**
- Modify: `libs/bot-core/src/format.ts`
- Modify: `libs/bot-core/src/__tests__/format.spec.ts`

- [ ] **Step 1: Update the tests to pass an explicit zone**

Replace `libs/bot-core/src/__tests__/format.spec.ts` with:
```ts
import { classLine, formatDateRu, formatDayHeader, formatTime, formatWeekRange, tomorrowDateKey } from '../format';
import type { IClassEntry } from '../types';

const MSK = 'Europe/Moscow';

describe('formatTime', () => {
    it('renders HH:MM in the given zone', () => {
        expect(formatTime('2026-06-12T10:05:00.000Z', MSK)).toBe('13:05');
        expect(formatTime('2026-06-12T10:05:00.000Z', 'Asia/Yekaterinburg')).toBe('15:05');
    });
});

describe('formatDayHeader', () => {
    it('capitalises a Russian weekday + day + month', () => {
        expect(formatDayHeader('2026-06-12')).toBe('Пятница, 12 июня');
    });
});

describe('classLine', () => {
    const base: IClassEntry = {
        name: 'Йога',
        startTime: '2026-06-12T10:00:00.000Z',
        durationMinutes: 60,
        status: 'scheduled',
        coachName: 'Анна',
    };

    it('renders a scheduled class (time in the given zone)', () => {
        expect(classLine(base, MSK)).toBe('⏰ 13:00 — Йога (Анна, 60мин)');
    });

    it('marks cancelled classes', () => {
        expect(classLine({ ...base, status: 'cancelled' }, MSK)).toContain('❌ отменено');
    });
});

describe('formatWeekRange', () => {
    it('collapses the month within one month', () => {
        expect(formatWeekRange('2026-06-12', '2026-06-18')).toBe('12–18 июня');
    });

    it('shows both months across a boundary', () => {
        expect(formatWeekRange('2026-06-30', '2026-07-06')).toBe('30 июня – 6 июля');
    });
});

describe('formatDateRu', () => {
    it('renders a full date in the given zone', () => {
        expect(formatDateRu(new Date('2026-06-12T00:00:00.000Z'), MSK)).toBe('12 июня 2026 г.');
    });
});

describe('tomorrowDateKey', () => {
    it('returns a YYYY-MM-DD string', () => {
        expect(tomorrowDateKey(MSK)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `source ~/.nvm/nvm.sh && nvm use 22.13.1 && npx nx test bot-core`
Expected: FAIL — `formatTime` expects 1 arg, etc.

- [ ] **Step 3: Update format.ts**

Replace `libs/bot-core/src/format.ts` with:
```ts
import { formatInClubTz } from '@fitcalendar/shared';

import type { IClassEntry } from './types';

/** "12 июня 2026 г." style — full date for single-day headers, in the club zone. */
export function formatDateRu(date: Date, timeZone: string): string {
    return formatInClubTz(date, timeZone, 'd MMMM yyyy') + ' г.';
}

/** "Пятница, 12 июня" from a YYYY-MM-DD key. */
export function formatDayHeader(isoDate: string): string {
    const label = new Date(`${isoDate}T00:00:00`).toLocaleDateString('ru-RU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Club-local HH:MM from an ISO timestamp. */
export function formatTime(isoString: string, timeZone: string): string {
    return formatInClubTz(isoString, timeZone, 'HH:mm');
}

/** "12–18 июня" within a month, or "30 июня – 6 июля" across a boundary. */
export function formatWeekRange(startISO: string, endISO: string): string {
    const start = new Date(`${startISO}T00:00:00`);
    const end = new Date(`${endISO}T00:00:00`);
    const monthOf = (d: Date): string =>
        d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(/^\d+\s+/, '');
    const startMonth = monthOf(start);
    const endMonth = monthOf(end);
    if (startMonth === endMonth) {
        return `${start.getDate()}–${end.getDate()} ${endMonth}`;
    }
    return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

/** One schedule line, e.g. "⏰ 13:00 — Йога (Анна, 60мин)". */
export function classLine(cls: IClassEntry, timeZone: string): string {
    const suffix = cls.status === 'cancelled' ? ' ❌ отменено' : '';
    return `⏰ ${formatTime(cls.startTime, timeZone)} — ${cls.name} (${cls.coachName}, ${cls.durationMinutes}мин)${suffix}`;
}

/** YYYY-MM-DD for tomorrow in the club zone. */
export function tomorrowDateKey(timeZone: string): string {
    return formatInClubTz(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone, 'yyyy-MM-dd');
}
```
(`formatDayHeader`/`formatWeekRange` operate on bare date keys and stay timezone-independent. Russia has no DST, so `now + 24h` is a safe "tomorrow".)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test bot-core`
Expected: format.spec PASS; `week-message.spec` and command registration will still fail to compile — fixed in Tasks 8–9.

- [ ] **Step 5: Commit (defer green build to Task 9)**

```bash
git add libs/bot-core/src/format.ts libs/bot-core/src/__tests__/format.spec.ts
git commit -m "feat(bot-core): thread timeZone through time/date formatters"
```

---

### Task 8: buildWeekMessage takes a timeZone param

**Files:**
- Modify: `libs/bot-core/src/week-message.ts`
- Modify: `libs/bot-core/src/__tests__/week-message.spec.ts`

- [ ] **Step 1: Update the test signatures + expectations**

In `libs/bot-core/src/__tests__/week-message.spec.ts`, add a constant and pass the zone (new signature is `buildWeekMessage(days, offset, timeZone, miniAppUrl?)`):

At the top after imports add:
```ts
const MSK = 'Europe/Moscow';
```
Then update every `buildWeekMessage(...)` call:
- `buildWeekMessage(week, 0)` → `buildWeekMessage(week, 0, MSK)`
- `buildWeekMessage(emptyWeek, 0)` → `buildWeekMessage(emptyWeek, 0, MSK)`
- `buildWeekMessage(week, -4)` → `buildWeekMessage(week, -4, MSK)`
- `buildWeekMessage(week, 8)` → `buildWeekMessage(week, 8, MSK)`
- `buildWeekMessage(week, 2)` → `buildWeekMessage(week, 2, MSK)`
- `buildWeekMessage(week, 0, 'https://app.example.com')` → `buildWeekMessage(week, 0, MSK, 'https://app.example.com')`

The `⏰ 13:00 — Йога` expectation stays correct (10:00Z in MSK = 13:00).

- [ ] **Step 2: Update week-message.ts**

In `libs/bot-core/src/week-message.ts`, change the signature and the `classLine` call:
```ts
export function buildWeekMessage(
    days: IWeekDay[],
    offset: number,
    timeZone: string,
    miniAppUrl?: string,
): WeekMessage {
```
and inside the `blocks` map:
```ts
        .map((day) => `— ${formatDayHeader(day.date)} —\n${day.classes.map((c) => classLine(c, timeZone)).join('\n')}`);
```

- [ ] **Step 3: Commit (build goes green in Task 9)**

```bash
git add libs/bot-core/src/week-message.ts libs/bot-core/src/__tests__/week-message.spec.ts
git commit -m "feat(bot-core): buildWeekMessage renders class times in a given zone"
```

---

### Task 9: register-schedule-commands resolves the club zone per command

**Files:**
- Modify: `libs/bot-core/src/types.ts`
- Modify: `libs/bot-core/src/register-schedule-commands.ts`

- [ ] **Step 1: Add getTimeZone to the data source contract**

In `libs/bot-core/src/types.ts`, add to the `ScheduleDataSource` interface:
```ts
export interface ScheduleDataSource {
    getToday(): Promise<IClassEntry[]>;
    getByDate(dateKey: string): Promise<IClassEntry[]>;
    getWeek(weekOffset: number): Promise<IWeekDay[]>;
    /** The club's IANA timezone, resolved per command so admin edits take effect live. */
    getTimeZone(): Promise<string>;
}
```

- [ ] **Step 2: Resolve and thread the zone in register-schedule-commands.ts**

In `libs/bot-core/src/register-schedule-commands.ts`:

Change `replyForDay` to accept the zone and use it in `classLine`:
```ts
    const replyForDay = async (
        ctx: Context,
        classes: IClassEntry[],
        header: string,
        emptyText: string,
        timeZone: string,
    ): Promise<void> => {
        if (classes.length === 0) {
            await ctx.reply(`${header}\n\n${emptyText}`);
            return;
        }
        const body = classes.map((c) => classLine(c, timeZone)).join('\n');
        await ctx.reply(`${header}\n\n${body}`, dayMarkup ? { reply_markup: dayMarkup } : undefined);
    };
```

`/today` handler:
```ts
    bot.command('today', async (ctx) => {
        try {
            const tz = await dataSource.getTimeZone();
            const classes = await dataSource.getToday();
            await replyForDay(
                ctx,
                classes,
                `📅 Расписание на сегодня, ${formatDateRu(new Date(), tz)}`,
                'Сегодня занятий нет 😴',
                tz,
            );
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });
```

`/tomorrow` handler:
```ts
    bot.command('tomorrow', async (ctx) => {
        try {
            const tz = await dataSource.getTimeZone();
            const dateKey = tomorrowDateKey(tz);
            const classes = await dataSource.getByDate(dateKey);
            await replyForDay(
                ctx,
                classes,
                `📅 Расписание на завтра, ${formatDayHeader(dateKey)}`,
                'Завтра занятий нет 😴',
                tz,
            );
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });
```

`/week` handler:
```ts
    bot.command('week', async (ctx) => {
        try {
            const tz = await dataSource.getTimeZone();
            const days = await dataSource.getWeek(0);
            const { text, replyMarkup } = buildWeekMessage(days, 0, tz, miniAppUrl);
            await ctx.reply(text, { reply_markup: replyMarkup });
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });
```

`week:*` callback:
```ts
    bot.callbackQuery(/^week:(-?\d+)$/, async (ctx) => {
        const target = clampWeekOffset(Number.parseInt(ctx.match[1] ?? '', 10));
        let message;
        try {
            const tz = await dataSource.getTimeZone();
            const days = await dataSource.getWeek(target);
            message = buildWeekMessage(days, target, tz, miniAppUrl);
        } catch {
            await ctx.answerCallbackQuery({ text: 'Не удалось загрузить расписание' });
            return;
        }
        try {
            await ctx.editMessageText(message.text, { reply_markup: message.replyMarkup });
        } catch {
            // "message is not modified" / stale message — safe to ignore.
        }
        await ctx.answerCallbackQuery();
    });
```

- [ ] **Step 3: Run the full bot-core suite green**

Run: `npx nx test bot-core`
Expected: PASS (all specs, including format + week-message).

- [ ] **Step 4: Commit**

```bash
git add libs/bot-core/src/types.ts libs/bot-core/src/register-schedule-commands.ts
git commit -m "feat(bot-core): resolve club timezone per command via data source"
```

---

### Task 10: Wire the club zone into the webhook bot data source

**Files:**
- Modify: `apps/api/src/modules/bot/handlers/schedule.handler.ts`
- Modify: `apps/api/src/modules/bot/bot.service.ts`

- [ ] **Step 1: Pass ClubService into the data source**

Replace `apps/api/src/modules/bot/handlers/schedule.handler.ts` with:
```ts
import type { IClassEntry, ScheduleDataSource } from '@fitcalendar/bot-core';
import { BOT_COMMANDS, registerScheduleCommands as registerShared } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

import type { ClubService } from '../../club/club.service';
import type { ClassResponseDto } from '../../schedule/dto/schedule-response.dto';
import type { ScheduleService } from '../../schedule/schedule.service';

export { BOT_COMMANDS };

function toEntry(cls: ClassResponseDto): IClassEntry {
    return {
        name: cls.name,
        startTime: cls.startTime,
        durationMinutes: cls.durationMinutes,
        status: cls.status,
        coachName: cls.coachName,
    };
}

/** In-process data source: the webhook bot calls ScheduleService directly. */
function serviceDataSource(scheduleService: ScheduleService, clubService: ClubService): ScheduleDataSource {
    return {
        getToday: async () => (await scheduleService.getToday()).map(toEntry),
        getByDate: async (dateKey) => (await scheduleService.getByDate(dateKey)).map(toEntry),
        getWeek: async (weekOffset) => {
            const { days } = await scheduleService.getWeek({}, weekOffset);
            return days.map((day) => ({ date: day.date, classes: day.classes.map(toEntry) }));
        },
        getTimeZone: () => clubService.getTimeZone(),
    };
}

/** Registers /today, /tomorrow, /week and week navigation on the webhook bot. */
export function registerScheduleCommands(
    bot: Bot<Context>,
    scheduleService: ScheduleService,
    clubService: ClubService,
    miniAppUrl?: string,
): void {
    registerShared(bot, serviceDataSource(scheduleService, clubService), miniAppUrl);
}
```

- [ ] **Step 2: Inject ClubService in bot.service.ts**

In `apps/api/src/modules/bot/bot.service.ts`:
- Add an import: `import { ClubService } from '../club/club.service';`
- Add `private readonly clubService: ClubService` to the constructor (ClubModule is already imported by BotModule, so it is injectable).
- Update the call at line ~102 to:
```ts
        registerScheduleCommands(this.bot, this.scheduleService, this.clubService, miniAppUrl);
```

- [ ] **Step 3: Build the API to confirm wiring compiles**

Run: `npx nx build api`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/bot/handlers/schedule.handler.ts apps/api/src/modules/bot/bot.service.ts
git commit -m "feat(api): webhook bot resolves club timezone via ClubService"
```

---

### Task 11: Standalone (polling) bot HTTP getTimeZone

**Files:**
- Modify: `apps/bot/src/commands/schedule.command.ts`

- [ ] **Step 1: Add getTimeZone to the HTTP data source**

In `apps/bot/src/commands/schedule.command.ts`:

Add the import:
```ts
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
```
Add this property to the object returned by `httpDataSource()` (after `getWeek`):
```ts
        getTimeZone: async () => {
            try {
                const club = await getJson<{ timezone?: string }>(`${apiUrl()}/api/club-info`);
                return club.timezone ?? DEFAULT_TIME_ZONE;
            } catch {
                return DEFAULT_TIME_ZONE;
            }
        },
```

- [ ] **Step 2: Build the standalone bot**

Run: `npx nx build bot`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/bot/src/commands/schedule.command.ts
git commit -m "feat(bot): standalone bot fetches club timezone from the API"
```

---

### Task 12: TZ-aware push notification copy

**Files:**
- Modify: `apps/api/src/modules/reminder/notification-format.ts`
- Modify: `apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts`
- Modify: `apps/api/src/modules/reminder/reminder-dispatcher.service.ts`
- Modify: `apps/api/src/modules/reminder/reminder.module.ts`

- [ ] **Step 1: Write the failing test for formatTimingRu**

Create `apps/api/src/modules/reminder/__tests__/notification-format.spec.ts`:
```ts
import { formatTimingRu } from '../notification-format';

const MSK = 'Europe/Moscow';

describe('formatTimingRu', () => {
    const now = new Date('2026-06-22T06:00:00Z'); // 09:00 MSK

    it('says Сегодня for a class later the same club day', () => {
        expect(formatTimingRu(new Date('2026-06-22T15:00:00Z'), MSK, now)).toBe('Сегодня в 18:00');
    });

    it('says Завтра for the next club day', () => {
        expect(formatTimingRu(new Date('2026-06-23T07:00:00Z'), MSK, now)).toBe('Завтра в 10:00');
    });

    it('uses an explicit date further out', () => {
        expect(formatTimingRu(new Date('2026-06-25T07:00:00Z'), MSK, now)).toBe('25 июня в 10:00');
    });

    it('honours a non-Moscow zone', () => {
        expect(formatTimingRu(new Date('2026-06-22T15:00:00Z'), 'Asia/Yekaterinburg', now)).toBe('Сегодня в 20:00');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx nx test api --testPathPattern notification-format`
Expected: FAIL — `formatTimingRu` expects 2–3 args / module shape mismatch.

- [ ] **Step 3: Update notification-format.ts**

Replace `apps/api/src/modules/reminder/notification-format.ts` with:
```ts
import { ru } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';

/** Escapes the HTML special characters Telegram's HTML parse mode cares about. */
export function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Renders a class start time in Russian club-local wording: "Сегодня в HH:mm",
 * "Завтра в HH:mm", or "d MMMM в HH:mm". `timeZone` is the club's IANA zone so
 * the wording matches what users see in the bot and apps. Shared by the reminder
 * dispatcher and the schedule notification listener.
 */
export function formatTimingRu(startTime: Date, timeZone: string, now: Date = new Date()): string {
    const dayKey = (d: Date): string => formatInTimeZone(d, timeZone, 'yyyy-MM-dd');
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const hhmm = formatInTimeZone(startTime, timeZone, 'HH:mm', { locale: ru });
    if (dayKey(startTime) === dayKey(now)) return `Сегодня в ${hhmm}`;
    if (dayKey(startTime) === dayKey(tomorrow)) return `Завтра в ${hhmm}`;
    return `${formatInTimeZone(startTime, timeZone, 'd MMMM', { locale: ru })} в ${hhmm}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx nx test api --testPathPattern notification-format`
Expected: PASS.

- [ ] **Step 5: Thread the zone through the listener**

In `apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts`:

Add the import: `import { ClubService } from '../../club/club.service';`

Add `ClubService` to the constructor:
```ts
    constructor(
        private readonly botSubscribers: BotSubscriberService,
        private readonly outboxService: NotificationOutboxService,
        private readonly clubService: ClubService,
        configService: ConfigService,
    ) {
        this.miniAppUrl = configService.get<string>('MINI_APP_URL');
    }
```

In each of the four handlers, fetch the zone and pass it to the message builder. Example for `handleCreated` (apply the same `const tz = await this.clubService.getTimeZone();` + `tz` argument to `handleChanged`, `handleCancelled`, `handleDeleted`):
```ts
    @OnEvent(SCHEDULE_CREATED_EVENT)
    async handleCreated(payload: IScheduleCreatedPayload): Promise<void> {
        const tz = await this.clubService.getTimeZone();
        await this.broadcast({
            type: 'schedule_created',
            scheduleEntryId: payload.scheduleEntryId,
            gateStartTime: payload.snapshot.startTime,
            text: this.createdMessage(payload.snapshot, tz),
        });
    }
```
For `handleChanged` pass `this.changedMessage(payload, tz)`; for `handleCancelled` pass `this.cancelledMessage(payload.snapshot, payload.cancellationReason, tz)`; for `handleDeleted` pass `this.cancelledMessage(payload.snapshot, null, tz)`.

Update the three private builders to accept and use `tz`:
```ts
    private createdMessage(s: IScheduleSnapshot, tz: string): string {
        return [
            '🆕 <b>Новое занятие</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${formatTimingRu(s.startTime, tz)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ].join('\n');
    }

    private changedMessage(p: IScheduleChangedPayload, tz: string): string {
        const timeChanged = p.oldStartTime.getTime() !== p.newStartTime.getTime();
        const durationChanged = p.oldDurationMinutes !== p.newDurationMinutes;

        const lines = ['⚠️ <b>Изменение в расписании</b>', '', `Занятие <b>${escapeHtml(p.snapshot.className)}</b>`];
        if (timeChanged) {
            lines.push(`❌ <s>Было: ${formatTimingRu(p.oldStartTime, tz)}</s>`);
            lines.push(`✅ Будет: <b>${formatTimingRu(p.newStartTime, tz)}</b>`);
        } else {
            lines.push(`🗓 ${formatTimingRu(p.newStartTime, tz)}`);
        }
        if (durationChanged) {
            lines.push(`⏱ Длительность: ${p.oldDurationMinutes} → ${p.newDurationMinutes} мин`);
        }
        lines.push(`👤 Тренер: ${escapeHtml(p.snapshot.coachName)}`);
        return lines.join('\n');
    }

    private cancelledMessage(s: IScheduleSnapshot, reason: string | null, tz: string): string {
        const lines = [
            '❌ <b>Занятие отменено</b>',
            '',
            `<b>${escapeHtml(s.className)}</b>`,
            `🗓 ${formatTimingRu(s.startTime, tz)}`,
            `👤 Тренер: ${escapeHtml(s.coachName)}`,
        ];
        const trimmed = reason?.trim();
        if (trimmed) lines.push('', `Причина: ${escapeHtml(trimmed)}`);
        return lines.join('\n');
    }
```

- [ ] **Step 6: Thread the zone through the reminder dispatcher**

In `apps/api/src/modules/reminder/reminder-dispatcher.service.ts`:
- Add the import: `import { ClubService } from '../club/club.service';`
- Inject `private readonly clubService: ClubService` into the constructor.
- Where line ~134 reads `const timing = formatTimingRu(entry.startTime);`, fetch the zone once before the loop that processes `entry` items and pass it in. Concretely, add `const tz = await this.clubService.getTimeZone();` at the start of the method that contains that loop (the one that maps entries to messages), then change the call to:
```ts
        const timing = formatTimingRu(entry.startTime, tz);
```

- [ ] **Step 7: Import ClubModule into ReminderModule**

In `apps/api/src/modules/reminder/reminder.module.ts`:
```ts
import { ClubModule } from '../club/club.module';
```
Add `ClubModule` to the `imports` array:
```ts
    imports: [
        TypeOrmModule.forFeature([Reminder, ScheduleEntry, NotificationOutbox]),
        BotModule,
        BotSubscriberModule,
        ClubModule,
    ],
```

- [ ] **Step 8: Run the reminder + listener tests + build**

Run:
```bash
npx nx test api --testPathPattern "reminder|schedule-notification|notification-format"
npx nx build api
```
Expected: tests PASS, build succeeds. (If an existing listener/dispatcher spec constructs the class directly, add a `{ getTimeZone: async () => 'Europe/Moscow' }` ClubService stub to its provider/constructor args.)

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/reminder/notification-format.ts apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts apps/api/src/modules/reminder/reminder-dispatcher.service.ts apps/api/src/modules/reminder/reminder.module.ts apps/api/src/modules/reminder/__tests__/notification-format.spec.ts
git commit -m "feat(api): render push notification times in the club timezone"
```

---

## Phase 3 — Admin API + form

### Task 13: Expose timezone in the admin DTOs

**Files:**
- Modify: `apps/api/src/modules/admin/club/dto/club-info.dto.ts`
- Modify: `apps/api/src/modules/admin/club/admin-club.service.ts`

(The public `ClubInfoDto` field was added in Task 5.)

- [ ] **Step 2: Admin AdminClubInfoDto gains timezone**

In `apps/api/src/modules/admin/club/dto/club-info.dto.ts`:
- Add the property to the class after `logoUrl`:
```ts
    @ApiProperty({ description: 'Club IANA timezone' }) timezone: string;
```
- Add it to `toAdminClubInfoDto`'s returned object (after `logoUrl: club.logoUrl,`):
```ts
        timezone: club.timezone,
```

- [ ] **Step 3: Admin service persists timezone + defaults it**

In `apps/api/src/modules/admin/club/admin-club.service.ts`:
- Add the import: `import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';`
- In `update()`, add after `club.mapUrl = dto.mapUrl ?? null;`:
```ts
        club.timezone = dto.timezone;
```
- In both `getOrCreate()` and `loadSingleton()`, add `timezone: DEFAULT_TIME_ZONE,` to the `clubRepo.create({ ... })` object.

- [ ] **Step 4: Build the API**

Run: `npx nx build api`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/club/dto/club-info.dto.ts apps/api/src/modules/admin/club/dto/club-info.dto.ts apps/api/src/modules/admin/club/admin-club.service.ts
git commit -m "feat(api): expose + persist club timezone in club DTOs"
```

---

### Task 14: Validate timezone on the admin update DTO

**Files:**
- Modify: `apps/api/src/modules/admin/club/dto/update-club-info.dto.ts`
- Modify: `apps/api/src/modules/admin/club/__tests__/update-club-info.dto.spec.ts`

- [ ] **Step 1: Write the failing test**

In `apps/api/src/modules/admin/club/__tests__/update-club-info.dto.spec.ts`, add (use the file's existing `plainToInstance` + `validate` helpers and a `validPayload()` factory — mirror the existing tests there; if the factory doesn't yet set `timezone`, add `timezone: 'Europe/Moscow'` to it):
```ts
    it('accepts a known Russian timezone', async () => {
        const dto = plainToInstance(UpdateClubInfoDto, { ...validPayload(), timezone: 'Asia/Yekaterinburg' });
        const errors = await validate(dto);
        expect(errors.find((e) => e.property === 'timezone')).toBeUndefined();
    });

    it('rejects an unknown timezone', async () => {
        const dto = plainToInstance(UpdateClubInfoDto, { ...validPayload(), timezone: 'Mars/Olympus' });
        const errors = await validate(dto);
        expect(errors.find((e) => e.property === 'timezone')).toBeDefined();
    });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx nx test api --testPathPattern update-club-info.dto`
Expected: FAIL — `timezone` not validated (unknown value passes).

- [ ] **Step 3: Add the validated field**

In `apps/api/src/modules/admin/club/dto/update-club-info.dto.ts`:
- Update imports:
```ts
import { RUSSIA_TIME_ZONE_IDS } from '@fitcalendar/shared';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
```
- Add the property (after `name`, before `address`, or anywhere in the class):
```ts
    @ApiProperty({ description: 'Club IANA timezone (one of the supported Russian zones)' })
    @IsString()
    @IsIn(RUSSIA_TIME_ZONE_IDS)
    timezone: string;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx nx test api --testPathPattern update-club-info.dto`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/admin/club/dto/update-club-info.dto.ts apps/api/src/modules/admin/club/__tests__/update-club-info.dto.spec.ts
git commit -m "feat(api): validate club timezone against the supported zone list"
```

---

### Task 15: Admin form timezone dropdown

**Files:**
- Modify: `apps/admin/src/shared/api/club.api.ts`
- Modify: `apps/admin/src/pages/ClubInfoPage.tsx`

- [ ] **Step 1: Add timezone to the admin API types**

In `apps/admin/src/shared/api/club.api.ts`:
- Add `timezone: string;` to `IAdminClubInfo` (after `logoUrl`).
- Add `timezone: string;` to `IClubInfoUpdatePayload`.

- [ ] **Step 2: Add timezone to the form**

In `apps/admin/src/pages/ClubInfoPage.tsx`:
- Add the import:
```ts
import { DEFAULT_TIME_ZONE, RUSSIA_TIME_ZONES } from '@fitcalendar/shared';
```
- Add `timezone: string;` to `IFormState` and `timezone: DEFAULT_TIME_ZONE,` to `EMPTY_FORM`.
- In the `.then((data) => { ... setForm({...}) })` block, add `timezone: data.timezone,` to the `setForm` object.
- In `handleSubmit`'s `adminClubApi.update({ ... })` call, add `timezone: form.timezone,`.
- Add a timezone `<select>` inside the "Основные данные" section, after the phone field's closing `</div>`:
```tsx
                        <div>
                            <label htmlFor="club-timezone" className="text-body mb-1 block">
                                Часовой пояс <span className="text-destructive">*</span>
                            </label>
                            <select
                                id="club-timezone"
                                value={form.timezone}
                                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                                disabled={submitting}
                                className="w-full rounded border border-border bg-surface p-2 text-body"
                            >
                                {RUSSIA_TIME_ZONES.map((z) => (
                                    <option key={z.id} value={z.id}>
                                        {z.label}
                                    </option>
                                ))}
                            </select>
                        </div>
```

- [ ] **Step 3: Typecheck/build the admin app**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/shared/api/club.api.ts apps/admin/src/pages/ClubInfoPage.tsx
git commit -m "feat(admin): timezone dropdown in club settings"
```

---

## Phase 4 — Frontend rendering

### Task 16: Mini-app club timezone context

**Files:**
- Modify: `apps/mini-app/src/shared/api/club.api.ts`
- Create: `apps/mini-app/src/shared/club-timezone.tsx`

- [ ] **Step 1: Add timezone to the mini-app ClubInfo type**

In `apps/mini-app/src/shared/api/club.api.ts`, add `timezone: string;` to the `ClubInfo` interface (after `logoUrl`).

- [ ] **Step 2: Create the context + hook**

Create `apps/mini-app/src/shared/club-timezone.tsx`:
```tsx
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { clubApi } from './api/club.api';

const ClubTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

/**
 * Fetches the club timezone once and provides it to the tree. While loading (or
 * on error) it serves DEFAULT_TIME_ZONE, so class times always render in a sane
 * club-local zone instead of the viewer's device zone.
 */
export function ClubTimeZoneProvider({ children }: { children: ReactNode }) {
    const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

    useEffect(() => {
        let cancelled = false;
        clubApi
            .getInfo()
            .then((info) => {
                if (!cancelled && info.timezone) setTz(info.timezone);
            })
            .catch(() => {
                /* keep the default */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return <ClubTimeZoneContext.Provider value={tz}>{children}</ClubTimeZoneContext.Provider>;
}

/** The club's IANA timezone for formatting class times. */
export function useClubTimeZone(): string {
    return useContext(ClubTimeZoneContext);
}
```

- [ ] **Step 3: Mount the provider near the app root**

Find where the mini-app's providers/router are composed (e.g. `apps/mini-app/src/App.tsx` or `main.tsx`). Wrap the app subtree with `<ClubTimeZoneProvider>...</ClubTimeZoneProvider>`. Run `grep -rn "createRoot\|<RouterProvider\|function App" apps/mini-app/src` to locate it, then add the import:
```tsx
import { ClubTimeZoneProvider } from '@/shared/club-timezone';
```
and wrap the existing children with `<ClubTimeZoneProvider>`.

- [ ] **Step 4: Build to confirm it compiles**

Run: `npx nx build mini-app`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/mini-app/src/shared/api/club.api.ts apps/mini-app/src/shared/club-timezone.tsx apps/mini-app/src/App.tsx
git commit -m "feat(mini-app): club timezone context provider"
```
(Adjust the staged path in step 5 if the provider was mounted in a file other than App.tsx.)

---

### Task 17: Render mini-app class instants in the club zone

**Files:**
- Modify: `apps/mini-app/src/components/ClassCard.tsx:32`
- Modify: `apps/mini-app/src/pages/ClassDetailPage.tsx:217,223,224`
- Modify: `apps/mini-app/src/pages/RemindersPage.tsx:187`
- Modify: `apps/mini-app/src/pages/CoachSchedulePage.tsx:20`

Only **class instants** (startTime/endTime) move to club TZ. User-picked calendar dates (SchedulePage's `selectedDate` strip, RemindersPage's group header built from a local date key, MembershipCard membership dates) stay as-is — they are not instants.

- [ ] **Step 1: ClassCard.tsx**

Add the imports:
```tsx
import { formatInClubTz } from '@fitcalendar/shared';
import { useClubTimeZone } from '@/shared/club-timezone';
```
Inside the component, add `const tz = useClubTimeZone();`. Replace the line 32 time range:
```tsx
    const timeRange = `${formatInClubTz(cls.startTime, tz, 'HH:mm')}–${formatInClubTz(cls.endTime, tz, 'HH:mm')}`;
```
(Use the component's actual `cls`/start/end prop names; ClassCard derives `startDate`/`endDate` from props — replace those `format(startDate, 'HH:mm')` usages with `formatInClubTz(<the ISO start>, tz, 'HH:mm')`. Keep the en-dash.)

- [ ] **Step 2: ClassDetailPage.tsx**

Add the same two imports and `const tz = useClubTimeZone();` inside the component. Replace:
- line 217: `{formatInClubTz(cls.startTime, tz, 'd MMMM yyyy, EEEE')}`
- line 223: `{formatInClubTz(cls.startTime, tz, 'HH:mm')}–`
- line 224: `{formatInClubTz(cls.endTime, tz, 'HH:mm')}`

- [ ] **Step 3: RemindersPage.tsx**

Add the two imports and `const tz = useClubTimeZone();` inside the component. Replace the line 187 class time:
```tsx
                                                        {formatInClubTz(item.class.startTime, tz, 'HH:mm')}
```
Leave line 19 (`formatHeader` over a local Date) and line 26 (`format(startDate, 'yyyy-MM-dd')` grouping key) as-is — but note: if grouping by day must match the club day, change line 26's key to `formatInClubTz(item.class.startTime, tz, 'yyyy-MM-dd')` and the header (line 19) to format that key. Apply this day-key correction so reminders group by club day.

Concretely, in the grouping logic replace line 26:
```tsx
        const key = formatInClubTz(item.class.startTime, tz, 'yyyy-MM-dd');
```
and where the header is rendered from the group key, format the key string (`new Date(`${key}T00:00:00`)`) — keep the existing `formatHeader` but feed it the parsed key date.

- [ ] **Step 4: CoachSchedulePage.tsx**

Add the two imports and `const tz = useClubTimeZone();`. Replace the line 20 day-key:
```tsx
        const dateKey = formatInClubTz(cls.startTime, tz, 'yyyy-MM-dd');
```
Leave line 36 (`formatDayLabel` over a local Date built from the key) as-is.

- [ ] **Step 5: Build + manual check**

Run: `npx nx build mini-app`
Expected: build succeeds. (Manual: with club TZ = Yekaterinburg, a 06:00Z class shows 11:00.)

- [ ] **Step 6: Commit**

```bash
git add apps/mini-app/src/components/ClassCard.tsx apps/mini-app/src/pages/ClassDetailPage.tsx apps/mini-app/src/pages/RemindersPage.tsx apps/mini-app/src/pages/CoachSchedulePage.tsx
git commit -m "feat(mini-app): render class times in the club timezone"
```

---

### Task 18: Admin club timezone context

**Files:**
- Create: `apps/admin/src/shared/club-timezone.tsx`

- [ ] **Step 1: Create the context + hook**

Create `apps/admin/src/shared/club-timezone.tsx` (admin reads the timezone from its authenticated club-info endpoint):
```tsx
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { adminClubApi } from './api';

const ClubTimeZoneContext = createContext<string>(DEFAULT_TIME_ZONE);

/** Fetches the club timezone once; serves DEFAULT_TIME_ZONE while loading/on error. */
export function ClubTimeZoneProvider({ children }: { children: ReactNode }) {
    const [tz, setTz] = useState<string>(DEFAULT_TIME_ZONE);

    useEffect(() => {
        let cancelled = false;
        adminClubApi
            .get()
            .then((info) => {
                if (!cancelled && info.timezone) setTz(info.timezone);
            })
            .catch(() => {
                /* keep the default */
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return <ClubTimeZoneContext.Provider value={tz}>{children}</ClubTimeZoneContext.Provider>;
}

/** The club's IANA timezone for formatting class times. */
export function useClubTimeZone(): string {
    return useContext(ClubTimeZoneContext);
}
```

- [ ] **Step 2: Mount the provider near the authenticated app root**

Locate the admin app shell (run `grep -rn "createRoot\|<RouterProvider\|function App\|AuthProvider" apps/admin/src`). Wrap the authenticated subtree (inside auth, so the request carries the admin token) with `<ClubTimeZoneProvider>`, importing:
```tsx
import { ClubTimeZoneProvider } from '@/shared/club-timezone';
```

- [ ] **Step 3: Build**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/src/shared/club-timezone.tsx apps/admin/src/App.tsx
git commit -m "feat(admin): club timezone context provider"
```
(Adjust the staged path in step 4 to wherever the provider was mounted.)

---

### Task 19: Render admin class instants in the club zone

**Files:**
- Modify: `apps/admin/src/features/schedule/ScheduleList.tsx:80`
- Modify: `apps/admin/src/features/schedule/ScheduleCalendar.tsx:174`
- Modify: `apps/admin/src/features/schedule/MoveClassConfirm.tsx:21`
- Modify: `apps/admin/src/features/schedule/bulk/BulkPreview.tsx:23`
- Modify: `apps/admin/src/features/schedule/bulk/DuplicateClassDialog.tsx:38`

Only class **instants** (`startTime` ISO strings) move to club TZ. Calendar/day grouping keys built from local `Date` pickers (ScheduleList line 21 `format(start,'yyyy-MM-dd')` where `start` is the class start → this one IS an instant; see below), ScheduleCalendar lines 67/78 (calendar grid days), CopyWeekDialog, DatePicker, and DuplicateClassDialog line 62 (selected target dates) stay as-is.

- [ ] **Step 1: ScheduleList.tsx**

Add imports:
```tsx
import { formatInClubTz } from '@fitcalendar/shared';
import { useClubTimeZone } from '@/shared/club-timezone';
```
Add `const tz = useClubTimeZone();` in the component. The grouping at line 21 keys classes by day from the class start — make it club-day-consistent:
```tsx
        const key = formatInClubTz(item.startTime, tz, 'yyyy-MM-dd');
```
(Use the actual variable holding the class ISO start at line 21; if `start` there is `parseISO(item.startTime)`, switch to `item.startTime`.) Replace the displayed time at line 80:
```tsx
                                        {formatInClubTz(item.startTime, tz, 'HH:mm')}
```
Leave the group-header date formatting (lines 38/40, from the day key) as-is.

- [ ] **Step 2: ScheduleCalendar.tsx**

Add the two imports + `const tz = useClubTimeZone();`. Replace line 174:
```tsx
                                            <span>{formatInClubTz(item.startTime, tz, 'HH:mm')}</span>
```
Leave the calendar grid day keys (lines 67/78) as-is — those iterate the visible month grid, not class instants. (If line 78 buckets classes into grid cells by `format(parseISO(item.startTime),'yyyy-MM-dd')`, change that specific bucketing key to `formatInClubTz(item.startTime, tz, 'yyyy-MM-dd')` so classes land in the correct club day; leave the grid-day key at line 67 as the local calendar day.)

- [ ] **Step 3: MoveClassConfirm.tsx**

This module formats `parseISO(iso)` at line 21 inside a standalone `formatWhen(iso)` helper. Make it take a zone. Add import `import { formatInClubTz } from '@fitcalendar/shared';`, change the helper to `function formatWhen(iso: string, tz: string)` returning `formatInClubTz(iso, tz, 'EEE d MMM, HH:mm')`, add `const tz = useClubTimeZone();` (import the hook) in the component, and pass `tz` at each call site of `formatWhen`.

- [ ] **Step 4: BulkPreview.tsx**

Add the two imports + `const tz = useClubTimeZone();`. Replace line 23:
```tsx
                            <span>{formatInClubTz(e.startTime, tz, 'EEE, d MMM HH:mm')}</span>
```

- [ ] **Step 5: DuplicateClassDialog.tsx**

Add the two imports + `const tz = useClubTimeZone();`. Replace the line 38 source-class time:
```tsx
                {source.trainingType.name} · {source.coach.name} · {formatInClubTz(source.startTime, tz, 'HH:mm')} (
```
Leave line 62 (the selected target date chip `format(new Date(`${d}T00:00:00`), 'd MMM')`) as-is — it is a picked calendar date, not an instant.

- [ ] **Step 6: Build + manual check**

Run: `npx nx build admin`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/admin/src/features/schedule/ScheduleList.tsx apps/admin/src/features/schedule/ScheduleCalendar.tsx apps/admin/src/features/schedule/MoveClassConfirm.tsx apps/admin/src/features/schedule/bulk/BulkPreview.tsx apps/admin/src/features/schedule/bulk/DuplicateClassDialog.tsx
git commit -m "feat(admin): render class times in the club timezone"
```

---

## Phase 5 — Revert the container TZ stop-gap

### Task 20: Remove the TZ env from docker-compose.prod.yml

**Files:**
- Modify: `docker/docker-compose.prod.yml`

- [ ] **Step 1: Remove the TZ block**

In `docker/docker-compose.prod.yml`, delete these lines from the `api` service `environment:` block (the comment + the `TZ` line):
```yaml
            # Single-city club: run the API in the club's timezone so date-fns day
            # bucketing (bot /today, /tomorrow, /week) matches the browser-based
            # admin + mini-app. Override per deployment via TZ in .env.prod.
            TZ: ${TZ:-Europe/Moscow}
```
Leave `NODE_ENV: production` and the rest intact. (Day-bucketing is now computed explicitly from `ClubInfo.timezone`, so container TZ is irrelevant. The membership cron returns to firing at UTC midnight — acceptable, not user-facing.)

- [ ] **Step 2: Validate compose syntax**

Run: `docker compose -f docker/docker-compose.prod.yml config >/dev/null && echo OK`
Expected: `OK` (no parse error).

- [ ] **Step 3: Commit**

```bash
git add docker/docker-compose.prod.yml
git commit -m "chore(deploy): drop stop-gap container TZ; ClubInfo.timezone is authoritative"
```

---

## Final verification (before finishing the branch)

- [ ] **Run the full affected test + build sweep**

Run:
```bash
source ~/.nvm/nvm.sh && nvm use 22.13.1
npx nx run-many -t test -p shared bot-core api
npx nx run-many -t build -p shared db bot-core api admin mini-app
```
Expected: all green.

- [ ] **Lint the touched projects**

Run: `npx nx run-many -t lint -p shared bot-core api admin mini-app`
Expected: no errors.

- [ ] **Manual smoke (local, optional):** With `ClubInfo.timezone = Asia/Yekaterinburg`, confirm the bot `/today`, mini-app ClassCard, and admin ScheduleList all show a 06:00Z class as **11:00**. With `Europe/Moscow`, as **09:00**.

After all tasks complete and the final review passes, use **superpowers:finishing-a-development-branch**, then deploy to prod via the standard flow (`git pull && docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d --build`) — the `AddClubTimezone` migration runs automatically on API boot. Verify the running container has the new code before reporting it live (see the deploy-verification memory).

---

## Self-Review

**Spec coverage:**
- `ClubInfo.timezone` single source of truth → Tasks 4, 5. ✓
- Admin dropdown of Russian zones → Tasks 2, 15. ✓
- DTO validation against the list → Task 14. ✓
- date-fns-tz dep + `RUSSIA_TIME_ZONES`/`isKnownTimeZone`/`formatInClubTz` → Tasks 1, 2, 3. ✓
- ScheduleService bucketing in club TZ → Task 6. ✓
- bot-core format.ts + buildWeekMessage + per-command resolution → Tasks 7, 8, 9; webhook + standalone wiring → Tasks 10, 11. ✓
- Push copy (`formatTimingRu`) + listener + dispatcher → Task 12. ✓
- Public club-info exposes timezone → Tasks 5, 13. ✓
- Mini-app + admin render in club TZ → Tasks 16–19. ✓
- Revert container TZ → Task 20. ✓
- Migration default `Europe/Moscow`, fallback when missing → Tasks 4, 5. ✓

**Placeholder scan:** Frontend mount steps (16.3, 18.2) and a few call-site line numbers say "use the actual prop/variable name" because exact local identifiers vary — each gives the exact grep to locate the spot and the exact replacement code. No TODO/TBD left.

**Type consistency:** `getTimeZone(): Promise<string>` consistent across ClubService (Task 5), ScheduleDataSource (Task 9), both data sources (Tasks 10, 11). `formatInClubTz(instant, timeZone, pattern, locale?)` consistent (Tasks 3, 6, 7, 17, 19). `formatTimingRu(startTime, timeZone, now?)` consistent (Task 12). `buildWeekMessage(days, offset, timeZone, miniAppUrl?)` consistent (Tasks 8, 9). `formatTime(iso, timeZone)` / `classLine(cls, timeZone)` / `tomorrowDateKey(timeZone)` / `formatDateRu(date, timeZone)` consistent (Tasks 7, 9). `timezone` field name consistent across entity, DTOs, API types (Tasks 4, 5, 13, 14, 15, 16).

**Ordering:** Each task is self-contained and compiles on its own — the public `ClubInfoDto.timezone` field is added in Task 5 (alongside the service change that consumes it), not deferred. bot-core Tasks 7–9 are committed as a unit; the bot-core build/test only goes fully green at Task 9 (noted in those tasks).
