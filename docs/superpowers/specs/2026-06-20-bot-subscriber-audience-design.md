# Bot-subscriber broadcast audience

**Дата:** 2026-06-20
**Статус:** утверждён дизайн, готов к плану реализации
**Связано:** [2026-06-15-schedule-broadcast-notifications-design.md](./2026-06-15-schedule-broadcast-notifications-design.md),
[2026-06-20-notification-suppress-toggle-design.md](./2026-06-20-notification-suppress-toggle-design.md)

## Проблема

Рассылка об изменениях расписания шлёт только клиентам с **привязанным по номеру**
Telegram (`customers.telegramId`). Привязка по номеру в продукте сейчас отключена,
а открытие mini-app / `/start` бота нигде не сохраняют telegram-id. Итог: аудитория
рассылки практически пустая — фича задеплоена, но слать почти некому.

Бизнес-намерение: уведомлять **всех, кто взаимодействовал с ботом/аппом**, а не только
привязанных клиентов.

## Ограничение Telegram

Бот может инициировать сообщение только пользователю, который **сам стартовал бота**
(есть открытый чат). Тем, кто открыл mini-app по ссылке, но бота не стартовал,
`sendMessage` вернёт 403. Поэтому достижимая аудитория = «все, кто стартовал бота»;
открывших апп тоже сохраняем, но недостижимые сами отсеются по 403 (см. ниже).

## Решения (зафиксированы с заказчиком)

1. **Захват:** сохраняем контакт и при контакте с ботом (`/start` и любое сообщение),
   и при открытии mini-app.
2. **Отписка:** авто по блокировке (ошибка 403 при отправке) **плюс** команда `/stop`
   (`/start` повторно подписывает).
3. **Бэкфилл:** на миграции засидить аудиторию из `customers` с непустым `telegramId`.

## Почему отдельная таблица

Переиспользовать `customers` нельзя: `customers.phone` — `NOT NULL UNIQUE`, а у
«просто стартовавших бота» телефона нет, строку не создать. Поэтому — отдельная
таблица `bot_subscriber`. Это также честно отражает домен: подписчик бота ≠ клиент.

## Архитектура

### 1. Сущность `bot_subscriber` (+ миграция)
Поля:
- `id` uuid PK
- `telegramId` bigint **UNIQUE** (chat id, к кому шлём)
- `firstName` varchar nullable, `username` varchar nullable (для персонализации/аудита)
- `source` text — `'bot' | 'mini_app'` (где впервые пойман; для аналитики)
- `isActive` boolean default true (false при блокировке/`/stop`)
- `createdAt` / `updatedAt`

Миграция:
- Создаёт таблицу + индекс по `telegramId` (unique) и по `isActive`.
- **Бэкфилл:** `INSERT INTO bot_subscriber (telegramId, firstName, source, isActive)
  SELECT telegramId, firstName, 'bot', true FROM customers WHERE telegramId IS NOT NULL
  ON CONFLICT (telegramId) DO NOTHING`.

### 2. `BotSubscriberService`
- `upsert({ telegramId, firstName, username, source })` — `repo.upsert` по `telegramId`:
  insert или обновить `firstName`/`username` и выставить `isActive = true` (контакт =
  ре-активация). Реализует «`/start` снова подписывает».
- `deactivate(telegramId)` — `isActive = false` (для `/stop` и для 403).
- `findActiveRecipients(): Promise<{ telegramId: number }[]>` — все `isActive = true`.
  Заменяет `CustomerService.findBroadcastRecipients` как источник рассылки.

### 3. Захват контактов (только в API; дев-polling-бот без БД — не захватывает)
- **Бот (прод-webhook, `BotService`):** middleware `bot.use(async (ctx, next) => …)` —
  если есть `ctx.from` и `!ctx.from.is_bot`, вызывает `upsert({ source: 'bot', … })`,
  затем `next()`. Срабатывает на `/start`, любом сообщении, callback-апдейтах.
  Ошибка upsert логируется, но не ломает обработку апдейта.
- **Mini-app:** `upsert({ source: 'mini_app', … })` в bootstrap-эндпоинте, который апп
  дёргает при открытии (точный эндпоинт `me.controller` — определить в плане; данные
  берутся из провалидированного `initData` через `@TelegramIdentity()`).
- **`/stop`:** команда в API-боте → `deactivate(telegramId)` + ответ
  «Вы отписались от уведомлений. /start — снова включить». `/start` реактивирует
  через middleware (он отрабатывает раньше команды), так что отдельной логики не нужно.

### 4. Источник получателей рассылки
- В `ScheduleNotificationListener.broadcast()` заменить
  `customerService.findBroadcastRecipients()` на `botSubscriberService.findActiveRecipients()`.
- В outbox `customerId` уже nullable (`ON DELETE SET NULL`) — для подписчиков пишем `null`;
  payload несёт `telegramId`, `text`, `webAppUrl` как сейчас.
- Удалить ставший мёртвым `CustomerService.findBroadcastRecipients` (+ его тест).

### 5. Авто-отписка по блокировке
- В `NotificationOutboxDispatcher` при ошибке отправки распознать `GrammyError` с
  `error_code === 403` (bot blocked / user deactivated): пометить строку outbox `failed`
  **без** ретраев и вызвать `botSubscriberService.deactivate(telegramId)`.
- Прочие ошибки ретраятся с бэкоффом как сейчас.

### 6. Не затрагивается
- Напоминания за N минут (per-class, идут по `customer.telegramId` — отдельная фича).
- 5-дневное окно рассылки и чекбокс «не уведомлять» (`notify`).

## Поток данных (пример)

1. Пользователь жмёт Start в боте → webhook → middleware `upsert(telegramId, source='bot')`
   → строка в `bot_subscriber`, `isActive=true`.
2. Админ меняет занятие в пределах 5 дней с включённым «Уведомить» → `SCHEDULE_CHANGED`.
3. Листенер: окно ок, `findActiveRecipients()` → N подписчиков → N строк в outbox.
4. Cron-диспетчер шлёт. Если кто-то заблокировал бота → 403 → его подписка `isActive=false`,
   строка `failed` без ретраев.

## Обработка ошибок
- Upsert при захвате — best-effort: лог при сбое, апдейт/запрос не падает.
- 403 на отправке → деактивация подписчика, без ретраев.
- Прочие ошибки отправки — существующий ретрай-бэкофф outbox.

## Тестирование
Бэкенд (unit):
- `BotSubscriberService`: upsert создаёт; повторный upsert реактивирует (`isActive=true`);
  `deactivate` выключает; `findActiveRecipients` отдаёт только активных.
- Middleware: апдейт с `ctx.from` вызывает upsert; апдейт от бота/без `from` — нет.
- `/stop` → `deactivate`.
- `NotificationOutboxDispatcher`: 403 → `deactivate` + строка `failed` без ретрая;
  не-403 → обычный ретрай.
- `ScheduleNotificationListener`: получатели берутся из `findActiveRecipients`.
- Миграция-бэкфилл: интеграционный тест, что привязанные клиенты попали в `bot_subscriber`.

## Вне рамок (YAGNI)
- Сегментация аудитории / выбор групп получателей.
- Отдельная админка списка подписчиков (на будущее).
- Захват контактов в дев-polling-боте (нет БД; прод-webhook покрывает прод).
- Повторное включение привязки по номеру (отдельное решение).
