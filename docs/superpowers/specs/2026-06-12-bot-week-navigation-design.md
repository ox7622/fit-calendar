# Bot Week Navigation — Design

**Date:** 2026-06-12
**Status:** Approved (pending spec review)

## Problem

The Telegram bot's `/week` command shows only one week — the next 7 days from
today — with no way to look further ahead or back. Users want to switch between
weeks.

Two near-identical bot implementations exist, and the command/handler logic is
**copy-pasted** between them:

- **`apps/bot`** — standalone polling bot (grammy). Used for local dev
  (`pnpm dev:tunnel`, `BOT_MODE=polling`) and the **staging** container
  (`fitcalendar-bot`). Fetches data over HTTP from the API.
- **`apps/api/src/modules/bot`** — webhook bot running in-process inside the API.
  The **only** bot in production (`fit-calendar.ru`; `docker-compose.prod.yml`
  has no separate bot service). Calls `ScheduleService` directly.

They are the same Telegram bot (one token), just two ways of receiving updates.
The duplicated logic is real tech debt: every command change must be made twice.

## Goals

1. Let users page between weeks in the bot (forward and backward).
2. Remove the command/handler duplication: shared logic lives in **one** place;
   both bots become thin adapters.
3. Keep `grammy` out of the frontend-facing `@fitcalendar/shared` library
   (imported by `apps/admin` and `apps/mini-app`).
4. Preserve backward compatibility of the public `/api/schedule/week` endpoint.

## Decisions (from brainstorming)

- **Navigation:** inline `◀ Пред.` / `След. ▶` buttons that **edit the same
  message in place** (clean chat, no clutter).
- **Week definition:** rolling 7-day blocks anchored on today. Week `offset = 0`
  is today..today+6 (current behavior). `offset = ±1` shifts by 7 days.
- **Range:** forward **and** backward, clamped to `[-4, +8]` weeks (≈ one month
  back, two months forward). One constant; easy to change.
- **Code structure:** consolidate shared logic into a new lib
  `@fitcalendar/bot-core`; both bots import it.

## Architecture

### 1. New library `libs/bot-core` (`@fitcalendar/bot-core`)

A bot-only shared library (so `grammy` never reaches frontend bundles). Holds all
shared logic, written once:

- **Neutral types** (no dependency on API DTOs):
  ```ts
  interface IClassEntry {
    name: string;
    startTime: string;        // ISO 8601
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    coachName: string;
  }
  interface IWeekDay { date: string; classes: IClassEntry[]; } // date: YYYY-MM-DD
  ```

- **`ScheduleDataSource`** — the one real difference between the two bots
  (HTTP vs in-process) abstracted behind an interface:
  ```ts
  interface ScheduleDataSource {
    getToday(): Promise<IClassEntry[]>;
    getByDate(dateKey: string): Promise<IClassEntry[]>;
    getWeek(weekOffset: number): Promise<IWeekDay[]>;
  }
  ```

- **`registerScheduleCommands(bot, dataSource, miniAppUrl?)`** — registers
  `/today`, `/tomorrow`, `/week`, and the `week:*` callback handler. This replaces
  the two duplicated `schedule.command.ts` / `schedule.handler.ts` bodies.

- **Pure helpers:** `buildWeekMessage(days, weekOffset)` → `{ text, replyMarkup }`,
  `classLine`, `formatDayHeader`, `formatWeekRange`, `BOT_COMMANDS`, and the
  range constants `WEEK_OFFSET_MIN = -4`, `WEEK_OFFSET_MAX = 8`.

### 2. Bots become thin adapters

- **`apps/bot`**: implements `ScheduleDataSource` via `fetch` to `API_URL`
  (`/api/schedule/today`, `/api/schedule/{date}`,
  `/api/schedule/week?weekOffset=N`), then calls `registerScheduleCommands`. The
  existing `schedule.command.ts` shrinks to this adapter; its local formatting
  helpers are deleted (now in bot-core).
- **`apps/api/src/modules/bot`**: implements `ScheduleDataSource` over
  `ScheduleService`, mapping `ClassResponseDto` → `IClassEntry` and
  `WeekScheduleDto.days` → `IWeekDay[]`. Same `registerScheduleCommands`.

### 3. API — `/schedule/week` accepts `weekOffset`

- `ScheduleService.getWeek(filter = {}, weekOffset = 0)`: anchor =
  `startOfDay(today) + 7 * weekOffset` days; the rest of the method is unchanged
  (7 days from the anchor). Service **clamps** `weekOffset` into
  `[WEEK_OFFSET_MIN, WEEK_OFFSET_MAX]`.
- `ScheduleController.getWeek` adds an optional `weekOffset` query param (integer,
  parsed/validated, default `0`). `weekOffset = 0` reproduces current behavior, so
  existing callers (mini-app, current bot) are unaffected.
- Response DTO is unchanged: each day already carries its `date`, so the bot
  builds the week-range header itself.

## Feature behavior

- `/week` renders week `0` via `buildWeekMessage` and sends it with the inline
  keyboard.
- Pressing a nav button fires a `callback_query` with `callback_data = "week:<N>"`
  (target offset; well under Telegram's 64-byte limit). The handler:
  1. parses the target offset,
  2. fetches that week through the `ScheduleDataSource`,
  3. **edits** the message (`editMessageText` + new inline keyboard),
  4. calls `answerCallbackQuery()` to clear the loading spinner.
- Keyboard layout per message:
  - Row 1: `◀ Пред.` and/or `След. ▶` — each arrow shown **only** if the target
    offset stays within `[-4, +8]` (arrow hidden at the boundary).
  - Row 2: existing mini-app button (when `miniAppUrl` is set).

## Mobile ergonomics (long weeks)

Inline keyboards always attach to the **bottom** of the message bubble, so a long
week requires scrolling down to reach the arrows. Mitigations:

1. **Compact rendering** — days with no classes are omitted (current behavior
   retained); class lines stay terse → a typical week fits roughly one screen.
2. **Range header at the top** (`📅 Неделя 12–18 июня`) — the current week is
   identifiable even mid-scroll. Cross-month ranges render as
   `30 июня – 6 июля`; the year is omitted.
3. Because the message is **edited in place**, the keyboard stays at the same
   on-screen position across presses — paging forward/back needs no thumb
   movement; scrolling is only needed to *read* a loaded week.

**Rejected alternative:** a `reply` keyboard pins buttons to the bottom of the
screen regardless of message length, but every press sends a new message —
cluttering the chat and breaking the chosen edit-in-place model. Not used.

## Empty weeks

A week with no classes still renders the header + `На этой неделе занятий нет 😴`
**and keeps the nav buttons**, so the user can page out of an empty week. (Current
behavior drops the buttons — that must change.)

## Error handling

- Data-source failure inside a callback → `answerCallbackQuery` with a short error
  text; the existing message is left untouched.
- `editMessageText` is wrapped in try/catch (handles "message is not modified" and
  stale/expired messages); failures are swallowed silently.
- Missing `API_URL` (standalone) / service errors keep the current
  "Сервис временно недоступен" / "Не удалось загрузить расписание" replies.

## Testing

- Logic now lives once in `bot-core`, so it is tested once. Add unit tests for:
  - `buildWeekMessage`: header range (same-month and cross-month), compact body,
    empty-week text, keyboard arrows present/hidden at `[-4, +8]` boundaries.
  - the `week:*` callback flow against a fake `ScheduleDataSource` (offset parse,
    fetch, edit, `answerCallbackQuery`).
- `ScheduleService.getWeek`: `weekOffset` anchoring and clamping.
- Migrate/extend the existing `apps/bot/src/__tests__/bot.spec.ts` rather than
  duplicating coverage.

## Out of scope

- Calendar (Mon–Sun) weeks — explicitly chose rolling 7-day blocks.
- Filters (difficulty/coach/type) in the bot week view.
- Fully merging the two bot apps into one deployment — only the *logic* is
  consolidated; both update-delivery modes (polling/webhook) stay.

## Affected files (approx.)

- **New:** `libs/bot-core/*` (project.json, tsconfig, eslint, jest, `src/index.ts`
  + modules); `@fitcalendar/bot-core` path in `tsconfig.base.json`.
- **Changed:** `apps/api/src/modules/schedule/schedule.service.ts`,
  `schedule.controller.ts`; `apps/bot/src/commands/schedule.command.ts`;
  `apps/api/src/modules/bot/handlers/schedule.handler.ts` (+ wherever it is
  registered); tests.
- **No DB changes.**
