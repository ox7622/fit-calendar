# Email-доставка приглашений админов + деактивация

**Дата:** 2026-06-13
**Статус:** утверждён, готов к плану реализации

## Контекст

Управление администраторами в админке уже почти готово: список, приглашение
(создание + реактивация неактивной строки), выдача reset-токена, установка пароля
по одноразовому токену. Единственный способ доставки ссылки сегодня — ручной
copy-link (`IssuedTokenLinkCard`): выдающий админ вручную передаёт ссылку новому.

Логин админа — свободная строка (может быть именем ИЛИ email). Почтовой
инфраструктуры в проекте нет вообще (ни nodemailer/SMTP, ни провайдера, ни env).

Две недоработки закрываются этой работой:

1. **Email-доставка** ссылки приглашения/сброса — когда логин является email.
2. **Деактивация** активного админа (сейчас можно пригласить/реактивировать, но не
   отключить).

## Решения (зафиксированы при брейнсторме)

- **Провайдер:** Yandex 360 SMTP (`smtp.yandex.ru:465`, secure) через `nodemailer`.
  Выбран ради доставляемости в российские ящики (домен `fit-calendar.ru`) и
  бесплатного ящика на своём домене.
- **Триггер:** письмо уходит, только если логин — валидный email. Иначе остаётся
  ручной copy-link.
- **Поведение:** письмо отправляется НА email, но API **всё равно возвращает
  ссылку**; фронт показывает «Письмо отправлено на X» + copy-link как fallback.
  Админ никогда не «застревает», если письмо не дошло.
- **«Подтверждение регистрации»** обеспечивается существующим потоком: клик по
  одноразовой ссылке и установка пароля = подтверждение владения почтой. Отдельный
  шаг подтверждения не вводится.
- **Объём:** email-доставка + деактивация админов.

## Часть A. Email-доставка ссылок

### Новый модуль `apps/api/src/modules/mail/`

- `MailModule` — экспортирует `MailService`; импортируется в `AdminUsersModule`.
- `MailService`:
  - Оборачивает `nodemailer` транспорт (`smtp.yandex.ru:465`, `secure: true`,
    auth user/pass из конфига).
  - Метод `sendAdminInviteLink({ to, name, url, expiresAt, purpose })`.
  - `isEnabled()` — `true`, только если заданы обязательные SMTP-переменные.
    Если SMTP не настроен — сервис инертен (no-op + единичный лог), как Cloudinary
    в деве. Основной поток не деградирует.
  - Транспорт создаётся лениво/однократно при первом использовании при включённом
    SMTP.
  - Шаблон письма — в коде (HTML + plain-text fallback, русский). Тема зависит от
    `purpose`:
    - `invite` → «Приглашение в админку FitCalendar»
    - `reset` → «Сброс пароля — админка FitCalendar»
  - Тело: обращение по имени, явная кнопка-ссылка + текстовый URL, «ссылка
    одноразовая, действует до {expiresAt}», «если вы не ожидали это письмо —
    проигнорируйте его».

### Конфиг / env

Добавить в `apps/api/src/config/env.validation.ts` (все `@IsString() @IsOptional()`)
и в `.env.example`:

| Переменная   | Пример                                    | Назначение                  |
|--------------|-------------------------------------------|-----------------------------|
| `SMTP_HOST`  | `smtp.yandex.ru`                          | хост SMTP                   |
| `SMTP_PORT`  | `465`                                     | порт                        |
| `SMTP_SECURE`| `true`                                    | TLS (строка, как SWAGGER)   |
| `SMTP_USER`  | `noreply@fit-calendar.ru`                 | логин SMTP                  |
| `SMTP_PASS`  | `…`                                       | пароль приложения Yandex    |
| `SMTP_FROM`  | `FitCalendar <noreply@fit-calendar.ru>`   | From-заголовок              |

`isEnabled()` требует как минимум `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
`SMTP_PORT` и `SMTP_SECURE` хранятся как строки и парсятся в call-site (число/boolean),
по аналогии с `SWAGGER_ENABLED` — чтобы избежать ложной coercion class-transformer.

### Определение email

Использовать `isEmail()` из `class-validator` (уже в зависимостях), не самописный
regex.

### Серверная сборка ссылки

URL = `${CORS_ORIGIN_ADMIN}/set-password?token=${encodeURIComponent(token)}`.
Если `CORS_ORIGIN_ADMIN` не задан — письмо не шлётся (лог-предупреждение),
поведение как при выключенном SMTP. (На клиенте ссылка по-прежнему строится из
`window.location.origin` в `buildSetPasswordUrl` — серверная сборка дублирует ту же
схему пути.)

### Встраивание в `AdminUsersService`

`invite()` и `issueReset()`:

1. Токен выпускается в транзакции как сейчас.
2. **После коммита** транзакции: если `isEmail(login)` и `mail.isEnabled()` и есть
   базовый URL — собрать URL и вызвать `mail.sendAdminInviteLink(...)`.
3. Отправка в `try/catch`: **сбой письма не валит запрос**. При ошибке —
   `emailSent=false`, лог `warn`.
4. Для `issueReset` адрес берётся из `login` целевой строки админа.

Рефактор: вынести отправку письма за пределы `dataSource.transaction(...)` —
захватить результат внутри транзакции, дополнить полями письма после.

### Изменение DTO ответа

`IssuedTokenResponseDto` (`invite-admin.dto.ts`) + клиентский `IIssuedTokenResponse`
получают:

- `emailSent: boolean`
- `sentToEmail: string | null`

### Фронт

- `IssuedTokenLinkCard` (`apps/admin/src/shared/components/`):
  - новый опциональный проп(ы) для статуса письма;
  - при `emailSent=true` — баннер «✓ Письмо отправлено на {sentToEmail}» над
    ссылкой; copy-link переформулирован как fallback («если письмо не дошло —
    передайте ссылку вручную»);
  - при email-логине и `emailSent=false` — мягкое «не удалось отправить письмо,
    передайте ссылку вручную».
- `AdminInvitePage` и `AdminsListPage` прокидывают `emailSent` / `sentToEmail`.

### Обработка ошибок (Часть A)

| Ситуация                  | Поведение                                                   |
|---------------------------|-------------------------------------------------------------|
| SMTP не настроен          | письмо не шлётся, `emailSent=false`, info-лог; copy-link    |
| Сбой отправки SMTP        | пойман, `warn`-лог, `emailSent=false`; copy-link            |
| `CORS_ORIGIN_ADMIN` пуст  | как «SMTP не настроен»                                       |
| Логин не email            | письмо не шлётся, `emailSent=false` (ожидаемо)              |

## Часть B. Деактивация админов

### Бэкенд

Новый эндпоинт `POST /admin/users/:id/deactivate` (под `AdminAuthGuard`), метод
`AdminUsersService.deactivate(issuerAdminId, targetId)`:

1. Ставит `isActive=false` для целевой строки.
2. **Гасит непогашенные токены** этого админа (`consumedAt = now` для всех с
   `consumedAt IS NULL`). Причина: иначе по старой invite/reset-ссылке
   `setPasswordWithToken` снова поднимет `isActive=true` — это обход деактивации.
3. Запрет деактивировать **себя** (`issuerAdminId === targetId`) → `409`.
4. Запрет отключить **последнего активного** админа (число активных должно остаться
   ≥ 1) → `409`.
5. Целевой админ не найден → `404`.

Всё (шаги 1–2 и проверки 3–4) — в одной транзакции, чтобы счётчик активных был
консистентен.

### Фронт

`AdminsListPage`:

- Кнопка «Отключить» для строк с `isActive=true`, с `window.confirm`.
- Кнопка **скрыта для самого себя** (id текущего админа из JWT / auth-контекста).
- После успеха — рефреш списка.
- Обработка `409` — понятное сообщение («Нельзя отключить себя / последнего
  администратора»).

### API-клиент

`adminUsersApi.deactivate(adminUserId)` → `POST /admin/users/:id/deactivate`.

## Тестирование

- **`MailService`** (unit, мок nodemailer):
  - при включённом SMTP вызывает `sendMail` с корректными `to`/`subject`/`from`;
  - при выключенном SMTP — no-op, `sendMail` не вызывается.
- **`AdminUsersService`** (spec, мок `MailService`):
  - login = email → `sendAdminInviteLink` вызван; `emailSent=true`;
  - login не email → письмо не шлётся; `emailSent=false`;
  - `MailService` бросает → `invite` всё равно успешен, `emailSent=false`;
  - `deactivate`: ставит `isActive=false` И гасит непогашенные токены;
  - `deactivate` себя → `409`;
  - `deactivate` последнего активного → `409`;
  - `deactivate` несуществующего → `404`.
- **Регрессия:** существующие spec'и `admin-users.service.spec.ts` и
  `admin-auth.*.spec.ts` обновить под новый конструктор/поля DTO.

## Вне объёма (YAGNI)

- Очередь/ретраи отправки писем (объём — единицы писем за всю жизнь системы;
  синхронная отправка с try/catch достаточна).
- Доставка через Telegram-бот (рассматривалась, отклонена в пользу email).
- Полноценный шаблонизатор писем (хватает inline HTML).
- Удаление (hard-delete) админов — только деактивация.
