# Club timezone as a setting, used everywhere

**Дата:** 2026-06-21
**Статус:** утверждён дизайн, готов к плану реализации

## Проблема

Время в продукте обрабатывается несогласованно по таймзонам:
- API отдаёт `startTime` как ISO в UTC.
- Мини-апп и админка форматируют его в **таймзоне браузера** (для зрителя не из города клуба покажет его местное, а не клубное время).
- Бот форматировал время в **UTC** (хардкод `getUTCHours`), а группировку по дням (`getToday/getWeek`) считал в TZ контейнера.
- TZ нигде не настраивается — она либо захардкожена, либо зависит от окружения.

Нужно: одна **настройка таймзоны на уровне клуба**, и чтобы **всё** (бот, пуши, группировка по дням, мини-апп, админка) показывало время в этой зоне, независимо от устройства зрителя и TZ сервера.

## Решения (зафиксированы с заказчиком)

1. **Единый источник истины — `ClubInfo.timezone`** (IANA-строка), редактируется админом в настройках клуба. Дефолт `Europe/Moscow`.
2. **Охват — везде сразу:** бэкенд (бот, пуши, группировка по дням) **и** фронтенды (мини-апп, админка).
3. **Ввод в админке — выпадающий список** российских зон (нельзя ввести мусор).
4. Контейнерный `TZ` env (добавленный ранее как временный фикс) **откатывается** — чтобы не было двух конкурирующих механизмов; `ClubInfo.timezone` авторитетен.

## Архитектура

### Источник истины
`ClubInfo.timezone: string` (IANA, напр. `Europe/Moscow`). Все серверные рендеры/группировки и оба фронта читают это значение. Контейнерная TZ больше не используется для логики.

### Общий слой (`@fitcalendar/shared`)
- `RUSSIA_TIME_ZONES` — курируемый список 11 российских IANA-зон с RU-лейблами и смещением, для дропдауна админки и валидации API:

  | IANA | Лейбл |
  |---|---|
  | Europe/Kaliningrad | Калининград (МСК−1, UTC+2) |
  | Europe/Moscow | Москва (МСК, UTC+3) |
  | Europe/Samara | Самара (МСК+1, UTC+4) |
  | Asia/Yekaterinburg | Екатеринбург (МСК+2, UTC+5) |
  | Asia/Omsk | Омск (МСК+3, UTC+6) |
  | Asia/Krasnoyarsk | Красноярск (МСК+4, UTC+7) |
  | Asia/Irkutsk | Иркутск (МСК+5, UTC+8) |
  | Asia/Yakutsk | Якутск (МСК+6, UTC+9) |
  | Asia/Vladivostok | Владивосток (МСК+7, UTC+10) |
  | Asia/Magadan | Магадан (МСК+8, UTC+11) |
  | Asia/Kamchatka | Камчатка (МСК+9, UTC+12) |

- `DEFAULT_TIME_ZONE = 'Europe/Moscow'`.
- `RUSSIA_TIME_ZONE_IDS` (the IANA ids) + an `isKnownTimeZone(id)` guard for validation.

> `date-fns-tz` is added as a dependency. Formatting uses `formatInTimeZone`; day-boundary math uses `toZonedTime`/`fromZonedTime`.

### DB
Migration adds `timezone varchar(64) NOT NULL DEFAULT 'Europe/Moscow'` to `club_info`. Existing row picks up the default.

### Backend (reads `ClubInfo.timezone`)
- **`ScheduleService`** (`getToday`, `getByDate`, `getWeek`): compute the day window and day-bucketing in the club TZ. `getToday` = “today in the club’s zone”; `getWeek` groups each entry by its club-TZ calendar day (`formatInTimeZone(startTime, tz, 'yyyy-MM-dd')`). Day boundaries become UTC instants via `fromZonedTime(startOfDay(toZonedTime(now, tz)), tz)`.
- **`bot-core` `format.ts`**: `formatTime`, `formatDayHeader`, `formatWeekRange`, `tomorrowDateKey` take an explicit `timeZone` argument (pure lib, no DB). `classLine`/`buildWeekMessage` thread it through.
- **Bot handler** (`apps/api/.../bot/handlers/schedule.handler.ts`): reads `ClubInfo.timezone` (via `ClubService`) per command and passes it into the bot-core renderers. (Read per command so an admin TZ change takes effect without a restart.)
- **Push copy** (`notification-format.ts` `formatTimingRu`): takes a `timeZone` param; callers — reminder dispatcher, schedule-change listener, outbox dispatcher — supply `ClubInfo.timezone`.

### Admin
- `ClubInfoResponse`/update DTO gain `timezone`. The update DTO validates it against `RUSSIA_TIME_ZONE_IDS` (reject unknown).
- Club-settings form adds a **timezone `<select>`** populated from `RUSSIA_TIME_ZONES`.

### Public API + frontends
- The public club-info endpoint includes `timezone` (so the mini-app can read it). Admin reads it from its club-info fetch.
- Mini-app + admin: a shared `formatInClubTz(iso, tz, pattern)` helper replaces the ~dozen `date-fns format(new Date(iso), 'HH:mm' | headers | 'yyyy-MM-dd')` call sites (ClassCard, SchedulePage, ClassDetailPage, RemindersPage, CoachSchedulePage; admin schedule list/edit/calendar). The club TZ is fetched once (existing club-info/me query) and passed down.

### Container TZ
Revert the `TZ: ${TZ:-Europe/Moscow}` line in `docker-compose.prod.yml`. All TZ logic is now explicit from `ClubInfo.timezone`. (The daily-midnight membership cron returns to firing at UTC midnight — acceptable; not user-facing.)

## Data flow (bot /today)
1. Admin sets `timezone = Asia/Yekaterinburg` in Club settings → persisted on `club_info`.
2. User sends `/today` → bot handler loads `ClubInfo.timezone`, calls `ScheduleService.getToday(tz)` (today in Yekaterinburg) → renders each line with `formatTime(iso, tz)` → times shown in +5.
3. Mini-app loads club-info (`timezone`), renders the same classes at the same wall-clock times.

## Error handling
- Unknown/invalid `timezone` in the update DTO → 400 (validated against the known list).
- Missing `timezone` (pre-migration safety) → fall back to `DEFAULT_TIME_ZONE`.

## Testing
- `RUSSIA_TIME_ZONES`/`isKnownTimeZone`: known ids pass, junk rejected.
- `formatInClubTz`: `2026-06-22T06:00:00Z` → `09:00` for Moscow, `11:00` for Yekaterinburg.
- `ScheduleService` bucketing: a class near local midnight lands on the correct club-TZ day; window edges correct for a non-Moscow zone.
- `bot-core` `formatTime`/`classLine` with an explicit zone (deterministic, host-TZ-independent).
- Admin update DTO rejects an unknown timezone.
- Push `formatTimingRu` renders in the supplied zone.

## Phasing (single spec, staged tasks)
1. Foundation: shared zone list + helper, `date-fns-tz` dep, DB migration + entity.
2. Backend: ScheduleService bucketing, bot-core TZ params + handler wiring, push copy.
3. Admin: DTO + validation + settings dropdown.
4. Frontends: expose `timezone`, shared `formatInClubTz`, swap call sites in mini-app + admin.
5. Revert container `TZ`.

## Out of scope (YAGNI)
- Per-user timezone (everyone sees club time by design).
- Non-Russian zones in the dropdown (free-text not offered; add zones to the list if needed).
- DST handling beyond what IANA/`date-fns-tz` already provides (Russia has no DST; the lib handles any that do).
