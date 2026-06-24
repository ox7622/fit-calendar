# Bot command responses — Claude-style redesign

**Date:** 2026-06-22
**Status:** Approved for planning

## Goal

Restyle the Telegram bot's command responses to match the FitSchedule design
language (source: `design_handoff_fitschedule/app/bot.jsx`, screenshot
`08-bot-dark.png`): clean bold headers, monospace accent times, strikethrough
for cancelled classes, no decorative emoji clutter.

Scope is **command responses only**: `/today`, `/tomorrow`, `/week`, `/start`,
`/club`. Reminder and cancellation push notifications shown in the mockup are
**not** built yet and are out of scope.

## Telegram rendering constraints

Bot messages cannot set custom colors or opacity, and we do not control the
recipient's theme — Telegram renders our HTML using the user's own light/dark
client theme. We send only semantic markup (`<b>`, `<code>`, `<s>`), and
Telegram colors it per theme automatically. There is no light-theme branch to
author. The redesign relies on:

- `<code>` for times → monospace, teal-tinted in dark, subtler tint in light.
- `<s>` for cancelled classes → strikethrough, identical in both themes.
- `<b>` for headers.

Accepted side effect: tapping a `<code>` time copies it to the clipboard.

### The "Открыть в приложении →" button

This stays the existing Telegram `web_app` **inline keyboard button** — which
renders exactly as the mockup shows: attached to the bottom of the bubble,
shared rounded corners, a thin separator line above it, accent-colored label,
full width. The mockup's `tg-inlinebtn` models this same Telegram element. The
only change is the label. No Direct Link Mini App / BotFather setup is needed;
mini-app auth keeps working as today via `web_app: { url }`.

## Changes

### Shared formatting — `libs/bot-core/src/format.ts`

- **`escapeHtml(value)`** — new shared helper. Class names, coach names, and
  club fields now live inside HTML messages and must be escaped. Replace the
  duplicate copy in `apps/api/src/modules/bot/handlers/club.handler.ts` with an
  import of this one.
- **`formatDayMonth(date)` → `"30 мая"`** — day + genitive month, no year, no
  "г.". Used by the `/today` and `/tomorrow` headers.
- **`classLine(cls)` rewritten to HTML:**
  - Active: `<code>HH:MM</code>  {escape(name)} · {escape(coach)}`
    (two spaces after `</code>` for the visual gap).
  - Cancelled: `<s><code>HH:MM</code>  {escape(name)}</s>` — coach dropped.
  - Removed: the `⏰` prefix, the `(coach, NNмин)` duration parenthetical, and
    the ` ❌ отменено` suffix. Cancellation is conveyed by strikethrough alone.

### `/today` and `/tomorrow` — `libs/bot-core/src/register-schedule-commands.ts`

- Headers become bold, no `📅`, no year, no weekday:
  - today: `<b>Расписание на сегодня, {formatDayMonth(today)}</b>`
  - tomorrow: `<b>Расписание на завтра, {formatDayMonth(tomorrow)}</b>`
- `replyForDay` sends `parse_mode: 'HTML'`.
- Empty states unchanged (`Сегодня занятий нет 😴` / `Завтра занятий нет 😴`).

### `/week` — `libs/bot-core/src/week-message.ts`

- Header `<b>Неделя {formatWeekRange(...)}</b>` (drop `📅`).
- Per-day subheaders become bold (`<b>{formatDayHeader(date)}</b>`) instead of
  the `— … —` rule, followed by that day's class lines.
- Reply sends `parse_mode: 'HTML'`. Empty-week text unchanged. Navigation
  keyboard and the `week:*` callback behavior unchanged; the callback's
  `editMessageText` reply also sends `parse_mode: 'HTML'`.

### Button label — `libs/shared/src/consts/bot.const.ts`

- `MINI_APP_BUTTON_TEXT`: `📅 Открыть приложение` → `Открыть в приложении →`.
- Consumed only by bot surfaces (today/tomorrow/week/start/fallback); the
  mini-app does not import it, so this is a pure bot-button label change. All
  surfaces update uniformly.

### `/start` — `start.handler.ts` (API) and `start.command.ts` (standalone)

- Already HTML. Keep accurate wording — do **not** adopt the mockup's
  "напомню о занятиях и сообщу об изменениях", since reminders are not built.
- Present commands as the mockup does, e.g. `Команды: /today /week`.
- `buildWelcomeMessage` is the single source both entry points call; the button
  picks up the new shared label automatically.

### `/club` — `club.handler.ts`

- Already HTML and on-brand. Only change: import the shared `escapeHtml`
  instead of the local duplicate. No visual change.

## Testing (TDD — update expectations before implementing)

Existing specs assert the old strings and must be updated to the new HTML:

- `libs/bot-core/src/__tests__/format.spec.ts` — `classLine` active/cancelled
  output, new `formatDayMonth`, `escapeHtml`.
- `libs/bot-core/src/__tests__/week-message.spec.ts` — bold header/subheaders,
  HTML body.
- `libs/bot-core/src/__tests__/register-schedule-commands.spec.ts` — headers,
  `parse_mode: 'HTML'` passed to replies and to the callback edit.
- `start.handler` / club handler tests — adjust for shared `escapeHtml` and any
  greeting wording change.

Add cases: HTML escaping of a class/coach name containing `<` and `&`.

## Manual verification

Run the bot locally (`pnpm dev:tunnel`, `BOT_MODE=polling`) and confirm in a
real Telegram client:

- `/today`, `/tomorrow`, `/week`, `/start`, `/club` render correctly with no
  raw tags leaking (escaping correct).
- **Both light and dark client themes** — monospace times legible, cancelled
  strikethrough readable.
- The bottom button reads `Открыть в приложении →` and launches the mini-app.
