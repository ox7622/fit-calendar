# Manual Smoke Runbook

End-to-end verification of the features that automated tests can't cover —
Telegram WebApp flows, real Cloudinary uploads, the daily cron actually firing.
Walk through these after every release. Each section maps to the story whose
"Manual smoke" task we never ticked in the story file.

## Prerequisites

-   API deployed with `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
    `MINI_APP_URL`, `CLOUDINARY_*` all set.
-   At least one admin user seeded (default: `admin@fitcalendar.ru`).
-   A test Telegram account you control (not the production club account).
-   Access to the Postgres DB for the few "verify the row looks right" checks.

## 1. Admin login + nav (Story 6.1 baseline)

-   [ ] Open the admin panel URL; redirect to `/login`.
-   [ ] Sign in with seeded admin credentials → land on `/dashboard`.
-   [ ] Top nav shows: Дашборд / Клиенты / Абонементы / Тренеры / Типы / Клуб (6 items).
-   [ ] Click each → route renders without console errors.
-   [ ] Click "Выйти" → back to `/login`.

## 2. Customer linking + reminders (5.1–5.6, 7.2)

### 2a. Subscribe + receive reminder

-   [ ] Open Mini App via `https://t.me/{bot_username}` → tap the menu button.
-   [ ] App shows the LinkPhonePrompt (first-time, unlinked).
-   [ ] Enter the phone of a seeded customer → "Привязать" → see schedule.
-   [ ] Tap a future class card → tap "🔔 Напоминание" → toggle on.
-   [ ] Verify in DB: `SELECT * FROM reminders WHERE "customerId"=...` — row with `status='pending'`, `notifyAt = startTime - reminderMinutes`.
-   [ ] Wait for `notifyAt` to pass (or manually `UPDATE reminders SET "notifyAt" = NOW() - INTERVAL '1 minute'`).
-   [ ] Within ~60s of next cron tick: Telegram message arrives with the class snapshot + "📅 Открыть" button.
-   [ ] Check `reminders.status` → `'sent'`, `sentAt` populated.

### 2b. Mini App reminders page (5.6)

-   [ ] In Mini App, navigate to `/reminders` via bottom nav.
-   [ ] Active reminder appears with class info.
-   [ ] Tap "Отменить" → row disappears, DB row gone (`DELETE` per AC6).

### 2c. /me page (7.4 — but covered here for the auth surface)

-   [ ] Tap profile icon in Mini App header → `/me`.
-   [ ] Linked customer's name + phone visible.

## 3. Schedule change notifications (5.4) + cancellation notifications (5.5)

Pre-req: from step 2a, the test customer has a pending reminder.

### 3a. Edit class → change notification

-   [ ] In admin: open the class's edit page (Dashboard → click class).
-   [ ] Shift `startTime` by +1h → Save.
-   [ ] Within ~5s: test Telegram account receives "⚠️ Изменение в расписании" with old + new times.
-   [ ] The customer's pending reminder's `notifyAt` was recomputed (verify in DB: `SELECT "notifyAt" FROM reminders` — should be `new_startTime - reminderMinutes`).

### 3b. Cancel class → cancellation notification

-   [ ] Click "Отменить занятие" → add a reason → Confirm.
-   [ ] Within ~5s: test Telegram account receives "❌ Занятие отменено" with the reason line included.
-   [ ] Pending reminders for that class are gone from `reminders` table (sent/failed rows kept).
-   [ ] Cancellation listener silently bails when the class was edit-then-cancelled in quick succession (5.4 cancellation race) — hard to reproduce manually; check the API logs for `Class cancelled after edit; skipping change notification` if you see both events fire close together.

## 4. Schedule management — view / create / cancel / delete (6.2 / 6.3 / 6.4)

-   [ ] Dashboard list view shows the next 14 days in 50-row pages, sorted ascending.
-   [ ] Switch to calendar view → 7 columns, classes laid out per day.
-   [ ] "Добавить занятие" → modal opens with **real dropdowns** for coach + training type (no UUID input — verifies 6.5/6.6 dropdown wiring).
-   [ ] Create a new class → appears in the list.
-   [ ] Open the class → change duration to 90 → save → list reflects the change.
-   [ ] Cancel it → list shows the cancelled state (strikethrough or muted).
-   [ ] Try Delete on a future class → 409 with "ещё не прошло".
-   [ ] Create a past class via DB (or wait), then Delete → succeeds.

## 5. Admin reference data — coaches / training types / club info (6.5 / 6.6 / 6.7)

### 5a. Coaches (6.5)

-   [ ] `/coaches` lists all (active + inactive).
-   [ ] "Добавить" → form opens; create one with bio + 2 specializations + 1 certification + isActive on.
-   [ ] Edit, click photo upload area → pick a JPEG ≤ 5MB → preview swaps to Cloudinary URL (DB `photoUrl` updated, URL has `fitcalendar/coaches/{id}/` path).
-   [ ] Try uploading a 6MB file → 413 (Multer rejects).
-   [ ] Try uploading a PDF → 400 "Поддерживаются только изображения".
-   [ ] Toggle isActive off → save → coach disappears from schedule form dropdown.
-   [ ] Try Delete on a coach with existing classes → 409.
-   [ ] Create a brand-new coach with no classes → Delete → succeeds.

### 5b. Training types (6.6)

-   [ ] `/training-types` lists all.
-   [ ] Create one: name + difficulty (intermediate) + impact types (cardio + strength) + equipment chips.
-   [ ] Edit the difficulty → reflected on the existing schedule entries of this type (no migration, just template change).
-   [ ] Try Delete with classes → 409.

### 5c. Club info (6.7)

-   [ ] `/club` loads — singleton auto-created on first GET (verify in DB the `club_info` table has exactly one row).
-   [ ] Edit name + phone → save → success toast.
-   [ ] Toggle Sunday closed → save → DB `workingHours.sunday` is `null`.
-   [ ] Set latitude only (no longitude) → form rejects inline + API returns 400 if you submit (test both client + server guard).
-   [ ] Set both lat + lon → "Посмотреть на карте" link appears → opens Google Maps.
-   [ ] Upload club logo → distinct from coach photo (no face crop, fit not fill).

## 6. CSV bulk import (7.3)

-   [ ] On `/customers`, click "Скачать пример" → `sample-customers.csv` downloads.
-   [ ] Click "Импорт CSV", select the sample → dry-run preview shows 3 to create, 0 errors.
-   [ ] Click "Применить" → success toast, 3 new customers in list.
-   [ ] Re-import same file → preview shows 3 to update, 0 errors.
-   [ ] Edit sample to add a malformed phone row + a duplicate phone → preview shows clear per-row errors with row numbers.
-   [ ] Click "Применить (только корректные строки)" → good rows go in, errored rows skipped.
-   [ ] Try a >5MB CSV → 413.

## 7. Membership assignment + profile (7.4)

-   [ ] In admin, open a customer with no active plan.
-   [ ] Click "Назначить план" → modal with plan dropdown.
-   [ ] Pick 12-month plan, today as start → submit → success.
-   [ ] In DB: `customer_memberships` has a row with `endDate = today + 12 months`, counters snapshotted from plan, `status='active'`.
-   [ ] Mini App `/me` for this customer shows the MembershipCard: name, "Действует до DD MMMM YYYY", countdown badge, features, counters.
-   [ ] Try assigning a second plan → 409 "Отменить и назначить новый?" → click confirm → old cancelled, new active.
-   [ ] Click "Отменить абонемент" → confirm → mini-app shows "Активного абонемента нет".
-   [ ] Click "Изменить дату" (inline) → pick a date 1 month earlier → save → mini-app countdown shifts.

### Cron flip

-   [ ] Manually set a membership's endDate to yesterday (`UPDATE customer_memberships SET "endDate" = CURRENT_DATE - 1 WHERE ...`).
-   [ ] Wait for midnight UTC (or trigger via a manual cron invocation in your environment — depends on the deploy platform).
-   [ ] Verify status flipped to `'expired'`.

## 8. Guest visits (7.5)

-   [ ] On the customer edit page (with an active 12-month plan), `GuestVisitsPanel` shows "0 из 2 использовано".
-   [ ] "Записать гостевой визит" → dialog opens with today as default → submit.
-   [ ] Counter updates to "1 из 2", visit appears in list.
-   [ ] Mini App `/me` next fetch reflects `guestVisitsRemaining: 1`.
-   [ ] Record a 2nd visit → counter → "2 из 2", button disabled.
-   [ ] Try a 3rd via curl directly: `curl -X POST .../admin/memberships/:id/guest-visits` → 400 with `code: 'NO_GUEST_VISITS_REMAINING'`.
-   [ ] Delete the 2nd visit → counter back to "1 из 2", button re-enabled.

## 9. Membership freeze (7.6)

-   [ ] `FreezePanel` shows "Доступно дней заморозки: 30 / 30" + "Заморозить" button.
-   [ ] Click → dialog: pick today as start, 14 days, optional note → submit.
-   [ ] Counter: "16 / 30", membership endDate shifted +14 days, panel now shows the freeze date range + "Отменить заморозку" button.
-   [ ] Mini App `/me` while the freeze covers today: yellow "❄️ Заморожен до DD MMMM" banner above the plan name.
-   [ ] Try recording a 2nd freeze → 400 `FREEZE_ALREADY_USED`.
-   [ ] Click "Отменить заморозку" → counter restored, endDate reverts.

## 10. Final cross-check

-   [ ] `pnpm nx test api` — still 305/305 (or higher).
-   [ ] API logs show no `ERROR`-level entries from any of the above flows.
-   [ ] Cloudinary dashboard shows the uploaded coach photos + club logo in the configured folders.
-   [ ] Telegram bot's `getWebhookInfo` shows the registered URL with `pending_update_count: 0`.

## Failure recovery

If any step fails, capture:

-   The HTTP status + response body
-   API log lines around the failure (search by the entity id you were working with)
-   The DB row state (for create/update flows)

Then escalate per your team's process.
