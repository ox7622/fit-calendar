# Bot Week Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Telegram bot users page forward/back between weeks via inline buttons, while consolidating the duplicated bot command logic into one shared library.

**Architecture:** A new `@fitcalendar/bot-core` library holds all shared bot logic (commands, week rendering, the `week:*` callback handler) behind a `ScheduleDataSource` interface. The standalone bot (`apps/bot`, HTTP) and the in-API webhook bot (`apps/api`) each supply a thin `ScheduleDataSource` adapter. The API's `getWeek` gains a clamped `weekOffset`. Week-range constants live in the frontend-safe `@fitcalendar/shared` so `grammy` never reaches frontend bundles.

**Tech Stack:** TypeScript, Nx monorepo, grammy (Telegram), NestJS (API), date-fns, Jest + ts-jest.

---

## Environment note

`nx` requires Node 22 in this repo. Before running any `nx ...` command:

```bash
nvm use 22.13.1
```

Commit with the pre-commit hook enabled (never `--no-verify`); stage by explicit path.

## File Structure

**New — `libs/bot-core/`** (`@fitcalendar/bot-core`):
- `project.json`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `jest.config.ts` — Nx library scaffold (lint + jest test targets).
- `src/index.ts` — public barrel.
- `src/types.ts` — `IClassEntry`, `IWeekDay`, `ScheduleDataSource`.
- `src/commands.const.ts` — `BOT_COMMANDS`.
- `src/format.ts` — `formatTime`, `formatDateRu`, `formatDayHeader`, `formatWeekRange`, `classLine`, `tomorrowDateKey`.
- `src/week-message.ts` — `buildWeekMessage`, `WeekMessage`.
- `src/register-schedule-commands.ts` — `registerScheduleCommands`.
- `src/__tests__/*.spec.ts` — unit tests.

**Modified:**
- `libs/shared/src/consts/bot.const.ts` — add `WEEK_OFFSET_MIN`, `WEEK_OFFSET_MAX`, `clampWeekOffset`.
- `tsconfig.base.json` — add `@fitcalendar/bot-core` path.
- `apps/api/src/modules/schedule/schedule.service.ts` — `getWeek(filter, weekOffset)`.
- `apps/api/src/modules/schedule/schedule.controller.ts` — `weekOffset` query param.
- `apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts` — tests.
- `apps/bot/src/commands/schedule.command.ts` — shrink to HTTP adapter.
- `apps/api/src/modules/bot/handlers/schedule.handler.ts` — shrink to service adapter.
- `apps/bot/src/__tests__/bot.spec.ts` — drop moved coverage if present.

---

## Task 1: Week-offset constants in `@fitcalendar/shared`

**Files:**
- Modify: `libs/shared/src/consts/bot.const.ts`
- Test: `libs/shared/src/consts/bot.const.spec.ts` (create)

Note: `libs/shared` tests run under Vite (`@nx/vite:test`). Vitest's `describe/it/expect` are API-compatible with the snippets below.

- [ ] **Step 1: Write the failing test**

Create `libs/shared/src/consts/bot.const.spec.ts`:

```ts
import { WEEK_OFFSET_MIN, WEEK_OFFSET_MAX, clampWeekOffset } from './bot.const';

describe('week offset', () => {
    it('exposes the navigable range', () => {
        expect(WEEK_OFFSET_MIN).toBe(-4);
        expect(WEEK_OFFSET_MAX).toBe(8);
    });

    it('clamps below the minimum', () => {
        expect(clampWeekOffset(-10)).toBe(-4);
    });

    it('clamps above the maximum', () => {
        expect(clampWeekOffset(99)).toBe(8);
    });

    it('passes values inside the range through', () => {
        expect(clampWeekOffset(0)).toBe(0);
        expect(clampWeekOffset(3)).toBe(3);
    });

    it('floors non-integers and defaults NaN to 0', () => {
        expect(clampWeekOffset(2.9)).toBe(2);
        expect(clampWeekOffset(Number.NaN)).toBe(0);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 22.13.1 && npx nx test shared
```
Expected: FAIL — `clampWeekOffset` is not exported.

- [ ] **Step 3: Implement**

Append to `libs/shared/src/consts/bot.const.ts`:

```ts
/** Furthest week the bot lets users page back to (weeks from the current one). */
export const WEEK_OFFSET_MIN = -4;
/** Furthest week the bot lets users page forward to. */
export const WEEK_OFFSET_MAX = 8;

/** Clamp an arbitrary week offset into the navigable range; NaN → 0. */
export function clampWeekOffset(offset: number): number {
    if (Number.isNaN(offset)) return 0;
    const floored = Math.trunc(offset);
    return Math.min(WEEK_OFFSET_MAX, Math.max(WEEK_OFFSET_MIN, floored));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test shared
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/shared/src/consts/bot.const.ts libs/shared/src/consts/bot.const.spec.ts
git commit -m "feat(shared): add clamped bot week-offset range"
```

---

## Task 2: API `getWeek` accepts `weekOffset`

**Files:**
- Modify: `apps/api/src/modules/schedule/schedule.service.ts:92-116`
- Test: `apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts`

- [ ] **Step 1: Write the failing test**

Find the existing `describe('getWeek'...)` block in the spec (or add one) and add these cases. They assume the suite's existing mock for the entry repository returns an empty list by default — adjust the mock reference name to match the file's existing setup.

```ts
describe('getWeek weekOffset', () => {
    it('defaults to the current week (offset 0) and returns 7 days', async () => {
        const result = await service.getWeek();
        expect(result.days).toHaveLength(7);
        const first = new Date(`${result.days[0].date}T00:00:00`);
        const today = new Date();
        expect(first.getDate()).toBe(today.getDate());
    });

    it('shifts the anchor by 7 days per offset', async () => {
        const week0 = await service.getWeek({}, 0);
        const week1 = await service.getWeek({}, 1);
        const start0 = new Date(`${week0.days[0].date}T00:00:00`).getTime();
        const start1 = new Date(`${week1.days[0].date}T00:00:00`).getTime();
        expect(Math.round((start1 - start0) / 86_400_000)).toBe(7);
    });

    it('clamps an out-of-range offset', async () => {
        const wayAhead = await service.getWeek({}, 999);
        const maxWeek = await service.getWeek({}, 8);
        expect(wayAhead.days[0].date).toBe(maxWeek.days[0].date);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 22.13.1 && npx nx test api --testPathPattern=schedule.service
```
Expected: FAIL — `getWeek` ignores the second argument, so the offset cases don't shift.

- [ ] **Step 3: Implement**

In `apps/api/src/modules/schedule/schedule.service.ts`, add to the existing `@fitcalendar/shared` import (or create one):

```ts
import { clampWeekOffset } from '@fitcalendar/shared';
```

Replace the `getWeek` method (currently lines 92-116) with:

```ts
    async getWeek(filter: ScheduleFilterDto = {}, weekOffset = 0): Promise<WeekScheduleDto> {
        const offset = clampWeekOffset(weekOffset);
        this.logger.log(`Fetching week schedule (offset ${offset})`);
        const anchor = startOfDay(addDays(new Date(), 7 * offset));
        const endOfWeek = startOfDay(addDays(anchor, 7));

        const entries = await this.queryEntries(anchor, endOfWeek, filter);

        const days: DayScheduleDto[] = [];
        for (let i = 0; i < 7; i++) {
            const dayDate = addDays(anchor, i);
            const dateStr = format(dayDate, 'yyyy-MM-dd');

            const dayClasses = entries
                .filter((entry) => {
                    const entryDate = format(new Date(entry.startTime), 'yyyy-MM-dd');
                    return entryDate === dateStr;
                })
                .map((entry) => this.mapToDto(entry));

            days.push({ date: dateStr, classes: dayClasses });
        }

        return { days };
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test api --testPathPattern=schedule.service
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/schedule/schedule.service.ts apps/api/src/modules/schedule/__tests__/schedule.service.spec.ts
git commit -m "feat(api): getWeek accepts clamped weekOffset"
```

---

## Task 3: Controller exposes `weekOffset` query param

**Files:**
- Modify: `apps/api/src/modules/schedule/schedule.controller.ts:63-83`

No new behavior to unit-test beyond Task 2 (the controller is a thin pass-through); verified via typecheck + e2e of the running app later.

- [ ] **Step 1: Implement**

In `apps/api/src/modules/schedule/schedule.controller.ts`, replace the `getWeek` handler (lines 63-83) with:

```ts
    @Get('week')
    @ApiOperation({ summary: 'Get weekly schedule (7 days from an anchor week)' })
    @ApiQuery({ name: 'difficultyLevel', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
    @ApiQuery({ name: 'coachId', required: false, type: String })
    @ApiQuery({ name: 'trainingTypeId', required: false, type: String })
    @ApiQuery({
        name: 'impactType',
        required: false,
        type: String,
        description: 'Comma-separated impact types, e.g. cardio,strength',
    })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiQuery({
        name: 'weekOffset',
        required: false,
        type: Number,
        description: 'Week to fetch relative to the current week (0 = current). Clamped to [-4, 8].',
    })
    @ApiResponse({ status: 200, description: 'Weekly schedule', type: WeekScheduleDto })
    async getWeek(
        @Query() filter: ScheduleFilterDto,
        @Query('weekOffset') weekOffset?: string,
    ): Promise<WeekScheduleDto> {
        const offset = weekOffset === undefined ? 0 : Number.parseInt(weekOffset, 10);
        return this.scheduleService.getWeek(filter, offset);
    }
```

(`Number.parseInt` of an invalid string yields `NaN`, which `clampWeekOffset` maps to 0.)

- [ ] **Step 2: Verify typecheck**

```bash
nvm use 22.13.1 && npx nx typecheck api
```
Expected: PASS (no type errors). If the project uses `build` for typechecking, run `npx nx build api` instead.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/schedule/schedule.controller.ts
git commit -m "feat(api): expose weekOffset query on GET /schedule/week"
```

---

## Task 4: Scaffold `libs/bot-core`

**Files (all create):**
- `libs/bot-core/project.json`
- `libs/bot-core/tsconfig.json`
- `libs/bot-core/tsconfig.lib.json`
- `libs/bot-core/tsconfig.spec.json`
- `libs/bot-core/jest.config.ts`
- `libs/bot-core/src/index.ts`
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Create `libs/bot-core/project.json`**

```json
{
    "name": "bot-core",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "libs/bot-core/src",
    "projectType": "library",
    "tags": [],
    "targets": {
        "test": {
            "executor": "@nx/jest:jest",
            "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
            "options": {
                "jestConfig": "libs/bot-core/jest.config.ts"
            }
        },
        "lint": {
            "executor": "@nx/eslint:lint",
            "outputs": ["{options.outputFile}"],
            "options": {
                "lintFilePatterns": ["libs/bot-core/src/**/*.ts"],
                "fix": true
            }
        }
    }
}
```

- [ ] **Step 2: Create the three tsconfig files**

`libs/bot-core/tsconfig.json`:

```json
{
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
        "module": "commonjs",
        "forceConsistentCasingInFileNames": true,
        "strict": true,
        "noImplicitOverride": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true
    },
    "files": [],
    "include": [],
    "references": [{ "path": "./tsconfig.lib.json" }, { "path": "./tsconfig.spec.json" }]
}
```

`libs/bot-core/tsconfig.lib.json`:

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "outDir": "../../dist/out-tsc",
        "composite": true,
        "declaration": true,
        "types": ["node"],
        "target": "es2021"
    },
    "include": ["src/**/*.ts"],
    "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

`libs/bot-core/tsconfig.spec.json`:

```json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "outDir": "../../dist/out-tsc",
        "module": "commonjs",
        "types": ["jest", "node"]
    },
    "include": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create `libs/bot-core/jest.config.ts`**

```ts
export default {
    displayName: 'bot-core',
    preset: '../../jest.preset.js',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../coverage/libs/bot-core',
    testMatch: ['**/*.spec.ts'],
};
```

- [ ] **Step 4: Create `libs/bot-core/src/index.ts`**

```ts
export * from './types';
export * from './commands.const';
export * from './format';
export * from './week-message';
export * from './register-schedule-commands';
```

- [ ] **Step 5: Register the path alias in `tsconfig.base.json`**

In the `compilerOptions.paths` object (around line 31-35), add the entry so the block reads:

```json
            "@fitcalendar/bot-core": ["libs/bot-core/src/index.ts"],
            "@fitcalendar/db": ["libs/db/src/index.ts"],
```

(Keep the existing entries; just insert the `bot-core` line in alphabetical position before `db`.)

- [ ] **Step 6: Commit**

The barrel references files created in later tasks, so don't run a build yet. Commit the scaffold:

```bash
git add libs/bot-core tsconfig.base.json
git commit -m "build(bot-core): scaffold @fitcalendar/bot-core library"
```

---

## Task 5: Shared types, `ScheduleDataSource`, and `BOT_COMMANDS`

**Files (create):**
- `libs/bot-core/src/types.ts`
- `libs/bot-core/src/commands.const.ts`

No standalone tests (pure declarations + a constant); exercised by later tasks.

- [ ] **Step 1: Create `libs/bot-core/src/types.ts`**

```ts
/** A single class as the bot renders it — provider-neutral (no API DTO coupling). */
export interface IClassEntry {
    name: string;
    startTime: string; // ISO 8601
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    coachName: string;
}

/** One day of the weekly schedule. `date` is a YYYY-MM-DD key. */
export interface IWeekDay {
    date: string;
    classes: IClassEntry[];
}

/**
 * Where the bot gets schedule data. The standalone bot implements this over HTTP;
 * the in-API webhook bot implements it over ScheduleService. This is the only
 * difference between the two bots.
 */
export interface ScheduleDataSource {
    getToday(): Promise<IClassEntry[]>;
    getByDate(dateKey: string): Promise<IClassEntry[]>;
    getWeek(weekOffset: number): Promise<IWeekDay[]>;
}
```

- [ ] **Step 2: Create `libs/bot-core/src/commands.const.ts`**

```ts
/** Command list shown in Telegram's "/" menu (set via setMyCommands). */
export const BOT_COMMANDS = [
    { command: 'start', description: 'Запустить бота' },
    { command: 'today', description: 'Расписание на сегодня' },
    { command: 'tomorrow', description: 'Расписание на завтра' },
    { command: 'week', description: 'Расписание на неделю' },
    { command: 'club', description: 'Контакты и часы работы' },
];
```

- [ ] **Step 3: Commit**

```bash
git add libs/bot-core/src/types.ts libs/bot-core/src/commands.const.ts
git commit -m "feat(bot-core): schedule data-source interface and command list"
```

---

## Task 6: Formatters

**Files:**
- Create: `libs/bot-core/src/format.ts`
- Test: `libs/bot-core/src/__tests__/format.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/bot-core/src/__tests__/format.spec.ts`:

```ts
import { classLine, formatDayHeader, formatTime, formatWeekRange, tomorrowDateKey } from '../format';
import type { IClassEntry } from '../types';

describe('formatTime', () => {
    it('renders UTC HH:MM', () => {
        expect(formatTime('2026-06-12T10:05:00.000Z')).toBe('10:05');
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

    it('renders a scheduled class', () => {
        expect(classLine(base)).toBe('⏰ 10:00 — Йога (Анна, 60мин)');
    });

    it('marks cancelled classes', () => {
        expect(classLine({ ...base, status: 'cancelled' })).toContain('❌ отменено');
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

describe('tomorrowDateKey', () => {
    it('returns a YYYY-MM-DD string one day ahead', () => {
        const key = tomorrowDateKey();
        expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const expected = new Date();
        expected.setDate(expected.getDate() + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        expect(key).toBe(`${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 22.13.1 && npx nx test bot-core
```
Expected: FAIL — `../format` cannot be resolved.

- [ ] **Step 3: Implement `libs/bot-core/src/format.ts`**

```ts
import type { IClassEntry } from './types';

/** "12 июня 2026 г." style — full date for single-day headers. */
export function formatDateRu(date: Date): string {
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
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

/** UTC HH:MM from an ISO timestamp. */
export function formatTime(isoString: string): string {
    const date = new Date(isoString);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/** "12–18 июня" within a month, or "30 июня – 6 июля" across a boundary. */
export function formatWeekRange(startISO: string, endISO: string): string {
    const start = new Date(`${startISO}T00:00:00`);
    const end = new Date(`${endISO}T00:00:00`);
    const monthOf = (d: Date): string => d.toLocaleDateString('ru-RU', { month: 'long' });
    const startMonth = monthOf(start);
    const endMonth = monthOf(end);
    if (startMonth === endMonth) {
        return `${start.getDate()}–${end.getDate()} ${endMonth}`;
    }
    return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
}

/** One schedule line, e.g. "⏰ 10:00 — Йога (Анна, 60мин)". */
export function classLine(cls: IClassEntry): string {
    const suffix = cls.status === 'cancelled' ? ' ❌ отменено' : '';
    return `⏰ ${formatTime(cls.startTime)} — ${cls.name} (${cls.coachName}, ${cls.durationMinutes}мин)${suffix}`;
}

/** YYYY-MM-DD for tomorrow in local time. */
export function tomorrowDateKey(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test bot-core
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/bot-core/src/format.ts libs/bot-core/src/__tests__/format.spec.ts
git commit -m "feat(bot-core): schedule formatting helpers + week range"
```

---

## Task 7: `buildWeekMessage`

**Files:**
- Create: `libs/bot-core/src/week-message.ts`
- Test: `libs/bot-core/src/__tests__/week-message.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/bot-core/src/__tests__/week-message.spec.ts`:

```ts
import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';

import type { IWeekDay } from '../types';
import { buildWeekMessage } from '../week-message';

const week: IWeekDay[] = [
    { date: '2026-06-12', classes: [{ name: 'Йога', startTime: '2026-06-12T10:00:00.000Z', durationMinutes: 60, status: 'scheduled', coachName: 'Анна' }] },
    { date: '2026-06-13', classes: [] },
    { date: '2026-06-14', classes: [] },
    { date: '2026-06-15', classes: [] },
    { date: '2026-06-16', classes: [] },
    { date: '2026-06-17', classes: [] },
    { date: '2026-06-18', classes: [] },
];

const emptyWeek: IWeekDay[] = week.map((d) => ({ ...d, classes: [] }));

describe('buildWeekMessage', () => {
    it('puts a range header on top and lists only non-empty days', () => {
        const { text } = buildWeekMessage(week, 0);
        expect(text.startsWith('📅 Неделя 12–18 июня')).toBe(true);
        expect(text).toContain('Пятница, 12 июня');
        expect(text).toContain('⏰ 10:00 — Йога');
        expect(text).not.toContain('Суббота'); // empty day omitted
    });

    it('shows the empty-week message but keeps nav buttons', () => {
        const { text, replyMarkup } = buildWeekMessage(emptyWeek, 0);
        expect(text).toContain('На этой неделе занятий нет 😴');
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).toContain('След. ▶');
    });

    it('hides the back arrow at the lower bound', () => {
        const { replyMarkup } = buildWeekMessage(week, -4);
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).not.toContain('◀ Пред.');
        expect(labels).toContain('След. ▶');
    });

    it('hides the forward arrow at the upper bound', () => {
        const { replyMarkup } = buildWeekMessage(week, 8);
        const labels = replyMarkup.inline_keyboard.flat().map((b) => (b as { text: string }).text);
        expect(labels).toContain('◀ Пред.');
        expect(labels).not.toContain('След. ▶');
    });

    it('encodes target offsets in callback_data', () => {
        const { replyMarkup } = buildWeekMessage(week, 2);
        const nav = replyMarkup.inline_keyboard[0] as Array<{ text: string; callback_data: string }>;
        expect(nav.find((b) => b.text === '◀ Пред.')?.callback_data).toBe('week:1');
        expect(nav.find((b) => b.text === 'След. ▶')?.callback_data).toBe('week:3');
    });

    it('appends the mini-app button when a URL is given', () => {
        const { replyMarkup } = buildWeekMessage(week, 0, 'https://app.example.com');
        const lastRow = replyMarkup.inline_keyboard[replyMarkup.inline_keyboard.length - 1];
        expect(lastRow[0]).toMatchObject({ text: MINI_APP_BUTTON_TEXT, web_app: { url: 'https://app.example.com' } });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 22.13.1 && npx nx test bot-core
```
Expected: FAIL — `../week-message` cannot be resolved.

- [ ] **Step 3: Implement `libs/bot-core/src/week-message.ts`**

```ts
import { clampWeekOffset, MINI_APP_BUTTON_TEXT, WEEK_OFFSET_MAX, WEEK_OFFSET_MIN } from '@fitcalendar/shared';

import { classLine, formatDayHeader, formatWeekRange } from './format';
import type { IWeekDay } from './types';

interface InlineButton {
    text: string;
    callback_data?: string;
    web_app?: { url: string };
}

export interface WeekMessage {
    text: string;
    replyMarkup: { inline_keyboard: InlineButton[][] };
}

/** Build the text + inline keyboard for one week of schedule. */
export function buildWeekMessage(days: IWeekDay[], weekOffset: number, miniAppUrl?: string): WeekMessage {
    const offset = clampWeekOffset(weekOffset);

    const startISO = days[0]?.date ?? '';
    const endISO = days[days.length - 1]?.date ?? startISO;
    const header = `📅 Неделя ${formatWeekRange(startISO, endISO)}`;

    const blocks = days
        .filter((day) => day.classes.length > 0)
        .map((day) => `— ${formatDayHeader(day.date)} —\n${day.classes.map(classLine).join('\n')}`);
    const body = blocks.length > 0 ? blocks.join('\n\n') : 'На этой неделе занятий нет 😴';

    const navRow: InlineButton[] = [];
    if (offset > WEEK_OFFSET_MIN) navRow.push({ text: '◀ Пред.', callback_data: `week:${offset - 1}` });
    if (offset < WEEK_OFFSET_MAX) navRow.push({ text: 'След. ▶', callback_data: `week:${offset + 1}` });

    const rows: InlineButton[][] = [];
    if (navRow.length > 0) rows.push(navRow);
    if (miniAppUrl) rows.push([{ text: MINI_APP_BUTTON_TEXT, web_app: { url: miniAppUrl } }]);

    return { text: `${header}\n\n${body}`, replyMarkup: { inline_keyboard: rows } };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test bot-core
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/bot-core/src/week-message.ts libs/bot-core/src/__tests__/week-message.spec.ts
git commit -m "feat(bot-core): build week message with nav keyboard"
```

---

## Task 8: `registerScheduleCommands` (commands + `week:*` callback)

**Files:**
- Create: `libs/bot-core/src/register-schedule-commands.ts`
- Test: `libs/bot-core/src/__tests__/register-schedule-commands.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `libs/bot-core/src/__tests__/register-schedule-commands.spec.ts`:

```ts
import type { Bot, Context } from 'grammy';

import { registerScheduleCommands } from '../register-schedule-commands';
import type { IWeekDay, ScheduleDataSource } from '../types';

function makeWeek(): IWeekDay[] {
    return Array.from({ length: 7 }, (_, i) => ({ date: `2026-06-${12 + i}`, classes: [] }));
}

function makeBot() {
    const handlers: { command: Record<string, (ctx: Context) => Promise<void>>; callback?: (ctx: Context) => Promise<void> } = { command: {} };
    const bot = {
        command: jest.fn((name: string, fn: (ctx: Context) => Promise<void>) => { handlers.command[name] = fn; }),
        callbackQuery: jest.fn((_trigger: unknown, fn: (ctx: Context) => Promise<void>) => { handlers.callback = fn; }),
    } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerScheduleCommands', () => {
    let dataSource: jest.Mocked<ScheduleDataSource>;

    beforeEach(() => {
        dataSource = {
            getToday: jest.fn().mockResolvedValue([]),
            getByDate: jest.fn().mockResolvedValue([]),
            getWeek: jest.fn().mockResolvedValue(makeWeek()),
        };
    });

    it('registers the three commands and the week callback', () => {
        const { bot } = makeBot();
        registerScheduleCommands(bot, dataSource);
        expect(bot.command).toHaveBeenCalledWith('today', expect.any(Function));
        expect(bot.command).toHaveBeenCalledWith('tomorrow', expect.any(Function));
        expect(bot.command).toHaveBeenCalledWith('week', expect.any(Function));
        expect(bot.callbackQuery).toHaveBeenCalledWith(expect.any(RegExp), expect.any(Function));
    });

    it('/week replies with week 0', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.command['week']({ reply } as unknown as Context);
        expect(dataSource.getWeek).toHaveBeenCalledWith(0);
        expect(reply).toHaveBeenCalledWith(expect.stringContaining('📅 Неделя'), expect.objectContaining({ reply_markup: expect.anything() }));
    });

    it('the callback edits the message to the parsed offset and answers', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn().mockResolvedValue(undefined);
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await handlers.callback!({ match: ['week:3', '3'], editMessageText, answerCallbackQuery } as unknown as Context);
        expect(dataSource.getWeek).toHaveBeenCalledWith(3);
        expect(editMessageText).toHaveBeenCalledWith(expect.stringContaining('📅 Неделя'), expect.objectContaining({ reply_markup: expect.anything() }));
        expect(answerCallbackQuery).toHaveBeenCalled();
    });

    it('the callback reports a load failure without editing', async () => {
        const { bot, handlers } = makeBot();
        dataSource.getWeek.mockRejectedValueOnce(new Error('boom'));
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn();
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await handlers.callback!({ match: ['week:1', '1'], editMessageText, answerCallbackQuery } as unknown as Context);
        expect(editMessageText).not.toHaveBeenCalled();
        expect(answerCallbackQuery).toHaveBeenCalledWith(expect.objectContaining({ text: expect.any(String) }));
    });

    it('swallows a stale-edit error but still answers', async () => {
        const { bot, handlers } = makeBot();
        registerScheduleCommands(bot, dataSource);
        const editMessageText = jest.fn().mockRejectedValue(new Error('message is not modified'));
        const answerCallbackQuery = jest.fn().mockResolvedValue(undefined);
        await expect(
            handlers.callback!({ match: ['week:2', '2'], editMessageText, answerCallbackQuery } as unknown as Context),
        ).resolves.toBeUndefined();
        expect(answerCallbackQuery).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
nvm use 22.13.1 && npx nx test bot-core
```
Expected: FAIL — `../register-schedule-commands` cannot be resolved.

- [ ] **Step 3: Implement `libs/bot-core/src/register-schedule-commands.ts`**

```ts
import { clampWeekOffset, MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { Bot, Context } from 'grammy';

import { classLine, formatDateRu, formatDayHeader, tomorrowDateKey } from './format';
import type { IClassEntry, ScheduleDataSource } from './types';
import { buildWeekMessage } from './week-message';

const LOAD_ERROR = 'Не удалось загрузить расписание. Попробуйте позже.';

function miniAppReplyMarkup(miniAppUrl?: string) {
    return miniAppUrl
        ? { inline_keyboard: [[{ text: MINI_APP_BUTTON_TEXT, web_app: { url: miniAppUrl } }]] }
        : undefined;
}

/**
 * Registers /today, /tomorrow, /week and the week:* navigation callback on a bot,
 * driven by a ScheduleDataSource. Shared by the standalone and webhook bots.
 */
export function registerScheduleCommands(
    bot: Bot<Context>,
    dataSource: ScheduleDataSource,
    miniAppUrl?: string,
): void {
    const dayMarkup = miniAppReplyMarkup(miniAppUrl);

    const replyForDay = async (
        ctx: Context,
        classes: IClassEntry[],
        header: string,
        emptyText: string,
    ): Promise<void> => {
        if (classes.length === 0) {
            await ctx.reply(`${header}\n\n${emptyText}`);
            return;
        }
        const body = classes.map(classLine).join('\n');
        await ctx.reply(`${header}\n\n${body}`, dayMarkup ? { reply_markup: dayMarkup } : undefined);
    };

    bot.command('today', async (ctx) => {
        try {
            const classes = await dataSource.getToday();
            await replyForDay(ctx, classes, `📅 Расписание на сегодня, ${formatDateRu(new Date())}`, 'Сегодня занятий нет 😴');
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.command('tomorrow', async (ctx) => {
        try {
            const dateKey = tomorrowDateKey();
            const classes = await dataSource.getByDate(dateKey);
            await replyForDay(ctx, classes, `📅 Расписание на завтра, ${formatDayHeader(dateKey)}`, 'Завтра занятий нет 😴');
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.command('week', async (ctx) => {
        try {
            const days = await dataSource.getWeek(0);
            const { text, replyMarkup } = buildWeekMessage(days, 0, miniAppUrl);
            await ctx.reply(text, { reply_markup: replyMarkup });
        } catch {
            await ctx.reply(LOAD_ERROR);
        }
    });

    bot.callbackQuery(/^week:(-?\d+)$/, async (ctx) => {
        const target = clampWeekOffset(Number.parseInt(ctx.match[1], 10));
        let message;
        try {
            const days = await dataSource.getWeek(target);
            message = buildWeekMessage(days, target, miniAppUrl);
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
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx nx test bot-core
```
Expected: PASS (all bot-core specs).

- [ ] **Step 5: Commit**

```bash
git add libs/bot-core/src/register-schedule-commands.ts libs/bot-core/src/__tests__/register-schedule-commands.spec.ts
git commit -m "feat(bot-core): shared schedule commands + week navigation callback"
```

---

## Task 9: Wire the standalone bot (`apps/bot`) to bot-core

**Files:**
- Rewrite: `apps/bot/src/commands/schedule.command.ts`
- Verify: `apps/bot/src/bot.ts` (call site unchanged — still `registerScheduleCommands(bot, miniAppUrl)`)

- [ ] **Step 1: Replace `apps/bot/src/commands/schedule.command.ts` entirely**

```ts
import type { IClassEntry, IWeekDay, ScheduleDataSource } from '@fitcalendar/bot-core';
import { BOT_COMMANDS, registerScheduleCommands as registerShared } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

export { BOT_COMMANDS };

async function getJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    return response.json() as Promise<T>;
}

/** HTTP-backed data source: the standalone bot reaches the API over the network. */
function httpDataSource(): ScheduleDataSource {
    const apiUrl = (): string => {
        const url = process.env['API_URL'];
        if (!url) throw new Error('API_URL is not configured');
        return url;
    };
    return {
        getToday: () => getJson<IClassEntry[]>(`${apiUrl()}/api/schedule/today`),
        getByDate: (dateKey) => getJson<IClassEntry[]>(`${apiUrl()}/api/schedule/${dateKey}`),
        getWeek: async (weekOffset) => {
            const { days } = await getJson<{ days: IWeekDay[] }>(`${apiUrl()}/api/schedule/week?weekOffset=${weekOffset}`);
            return days;
        },
    };
}

/** Registers /today, /tomorrow, /week and week navigation on the standalone (polling) bot. */
export function registerScheduleCommands(bot: Bot<Context>, miniAppUrl?: string): void {
    registerShared(bot, httpDataSource(), miniAppUrl);
}
```

- [ ] **Step 2: Check `apps/bot/src/bot.ts` still compiles**

The call site `registerScheduleCommands(bot, config.miniAppUrl)` is unchanged. If `bot.ts` imported `BOT_COMMANDS` from this file, it still works (re-exported). No edit expected.

- [ ] **Step 3: Typecheck and test the bot app**

```bash
nvm use 22.13.1 && npx nx typecheck bot && npx nx test bot
```
Expected: typecheck PASS. Tests: PASS — but if `bot.spec.ts` previously asserted on schedule formatting that has moved, see Task 11.

- [ ] **Step 4: Commit**

```bash
git add apps/bot/src/commands/schedule.command.ts
git commit -m "refactor(bot): standalone bot uses @fitcalendar/bot-core over HTTP"
```

---

## Task 10: Wire the webhook bot (`apps/api`) to bot-core

**Files:**
- Rewrite: `apps/api/src/modules/bot/handlers/schedule.handler.ts`
- Verify: `apps/api/src/modules/bot/bot.service.ts` (imports `BOT_COMMANDS` + `registerScheduleCommands` from the handler — keep those exports)

- [ ] **Step 1: Replace `apps/api/src/modules/bot/handlers/schedule.handler.ts` entirely**

```ts
import type { IClassEntry, ScheduleDataSource } from '@fitcalendar/bot-core';
import { BOT_COMMANDS, registerScheduleCommands as registerShared } from '@fitcalendar/bot-core';
import type { Bot, Context } from 'grammy';

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
function serviceDataSource(scheduleService: ScheduleService): ScheduleDataSource {
    return {
        getToday: async () => (await scheduleService.getToday()).map(toEntry),
        getByDate: async (dateKey) => (await scheduleService.getByDate(dateKey)).map(toEntry),
        getWeek: async (weekOffset) => {
            const { days } = await scheduleService.getWeek({}, weekOffset);
            return days.map((day) => ({ date: day.date, classes: day.classes.map(toEntry) }));
        },
    };
}

/** Registers /today, /tomorrow, /week and week navigation on the webhook bot. */
export function registerScheduleCommands(
    bot: Bot<Context>,
    scheduleService: ScheduleService,
    miniAppUrl?: string,
): void {
    registerShared(bot, serviceDataSource(scheduleService), miniAppUrl);
}
```

- [ ] **Step 2: Confirm `bot.service.ts` is unaffected**

It already imports `{ BOT_COMMANDS, registerScheduleCommands }` from `./handlers/schedule.handler` and calls `registerScheduleCommands(this.bot, this.scheduleService, miniAppUrl)` — both still exported with the same signatures. No edit expected.

- [ ] **Step 3: Typecheck and test the API**

```bash
nvm use 22.13.1 && npx nx typecheck api && npx nx test api
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/bot/handlers/schedule.handler.ts
git commit -m "refactor(api): webhook bot uses @fitcalendar/bot-core over ScheduleService"
```

---

## Task 11: Clean up moved coverage + full verification

**Files:**
- Modify (if needed): `apps/bot/src/__tests__/bot.spec.ts`

- [ ] **Step 1: Remove now-duplicated schedule tests from `bot.spec.ts`**

Open `apps/bot/src/__tests__/bot.spec.ts`. If it contains any `describe`/`it` blocks asserting on schedule formatting or the old `registerScheduleCommands` body (week text, class lines), delete those blocks — that behavior is now covered in `libs/bot-core`. Keep the `createBot`, `registerStartCommand`, and `errorMiddleware` tests. (As of this writing the file has no schedule-specific tests, so likely no change is needed — verify and leave as-is if so.)

- [ ] **Step 2: Run the full affected test + lint sweep**

```bash
nvm use 22.13.1
npx nx test shared && npx nx test bot-core && npx nx test bot && npx nx test api
npx nx lint bot-core && npx nx lint bot && npx nx lint api && npx nx lint shared
```
Expected: all PASS.

- [ ] **Step 3: Typecheck everything touched**

```bash
npx nx typecheck bot && npx nx typecheck api
```
Expected: PASS.

- [ ] **Step 4: Manual smoke test (running app)**

Start the API + standalone bot via the tunnel and exercise the bot in Telegram:

```bash
pnpm dev:tunnel
```

In the chat: send `/week`, confirm the range header (`📅 Неделя …`) and `След. ▶` button. Press `След. ▶` a few times — the **same message** updates to later weeks, `◀ Пред.` appears, and at +8 the forward arrow disappears. Page back to 0; confirm `◀ Пред.` is gone at the current week's lower edge (-4). Verify an empty week still shows the nav buttons.

- [ ] **Step 5: Commit any cleanup**

```bash
git add apps/bot/src/__tests__/bot.spec.ts
git commit -m "test(bot): drop schedule coverage moved to bot-core"
```

(Skip this commit if Step 1 made no changes.)

---

## Self-Review Notes

- **Spec coverage:** weekOffset API (Tasks 2-3), bot-core lib + ScheduleDataSource (Tasks 4-5), buildWeekMessage with compact body + range header + boundary-aware arrows + empty-week buttons (Task 7), callback edit-in-place + error handling (Task 8), both bots as thin adapters (Tasks 9-10), tests once in bot-core + service tests (Tasks 1,2,6,7,8,11). Mobile ergonomics handled by Task 7 (compact body, top header) and verified in Task 11 Step 4.
- **Deviation from spec (intentional):** the `WEEK_OFFSET_*` constants + `clampWeekOffset` live in `@fitcalendar/shared` (pure numbers, frontend-safe) instead of `bot-core`, so the API service depends on `shared` rather than on a bot library — cleaner dependency direction. bot-core re-uses the same constants.
- **Simplification (intentional):** both bots now emit one load-error message (`Не удалось загрузить расписание. Попробуйте позже.`); the standalone bot's former "Сервис временно недоступен" missing-`API_URL` branch is dropped (dev-only edge, now surfaced via the same catch).
- **Type consistency:** `ScheduleDataSource` (getToday/getByDate/getWeek), `IClassEntry`, `IWeekDay`, `buildWeekMessage(days, weekOffset, miniAppUrl?)`, `WeekMessage.replyMarkup.inline_keyboard`, `registerScheduleCommands(bot, dataSource, miniAppUrl?)` are used identically across Tasks 5-10.
