# Деплой: вход админов по логину вместо email

Миграция `RenameAdminEmailToLogin1780500000000` переименовывает колонку
`admin_users.email` → `login` (свободный уникальный логин, нормализация
`trim().toLowerCase()`). Email убран как обязательное поле: персонал клуба часто
без почты, а панель письма и не слала — invite/reset-ссылки передаются вручную.

> **Колонка переименовывается, а не пересоздаётся** — живая строка и unique-индекс
> сохраняются. Дефолтному админу миграция меняет логин `admin@fitcalendar.ru` → `admin`
> (пароль прежний).

Миграции на проде применяются **автоматически при старте API-контейнера**
(`Dockerfile.prod-api`: `pnpm db:migrate:prod && node dist/apps/api/main.js`).
Отдельной команды миграции руками не нужно — достаточно довезти код и пересобрать
api-образ.

---

## 0. Пред-флайт (локально)

```bash
git rev-parse HEAD   # запомни текущий прод-коммит — пригодится для отката
```

## 1. Закоммитить и запушить (локально)

Сервер деплоит из git, поэтому изменения должны быть в ветке. Стейджим по явным
путям, хук не пропускаем (`feat`, т.к. commitlint отклоняет `chore`):

```bash
git add \
  libs/db/src/entities/admin-user.entity.ts \
  libs/db/src/migrations/1780500000000-RenameAdminEmailToLogin.ts \
  libs/db/src/seeds/seed.ts \
  apps/api/src/modules/admin apps/api/src/common/guards \
  apps/admin/src/pages/LoginPage.tsx apps/admin/src/pages/AdminInvitePage.tsx \
  apps/admin/src/pages/AdminsListPage.tsx apps/admin/src/pages/SetPasswordPage.tsx \
  apps/admin/src/shared \
  libs/db/src/entities/__tests__ libs/db/src/seeds/__tests__ libs/db/src/migrations/__tests__

git commit -m "feat(admin): identify admins by login instead of email"
git push
```

## 2. На сервере — подтянуть код

```bash
ssh <user>@45.38.249.222
cd /opt/fit-calendar
git pull            # та же ветка, что деплоится
```

## 3. Пересборка — последовательно

На 1–2 ГБ RAM собирать оба образа разом рискует OOM — собираем по очереди.
api первым (на его старте прогонится миграция):

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d --build api
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d --build caddy
```

## 4. Проверить, что миграция применилась

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml logs --tail=80 api \
  | grep -iE "RenameAdminEmailToLogin|migration"
# ожидается: "Migration RenameAdminEmailToLogin1780500000000 has been executed successfully"
```

Подтвердить схему и значения в БД:

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml exec postgres \
  psql -U "$NX_DB_USER" -d "$NX_DB_NAME" -c \
  'SELECT login, name, "isActive" FROM admin_users;'
# колонка называется login; у дефолтного админа login = 'admin'
```

## 5. Смоук-тест

- `https://admin.fit-calendar.ru` → войти: **логин `admin`**, пароль прежний.
- «Администраторы» → «Пригласить»: поле теперь «Логин» (не Email).

---

## ⚠️ На что обратить внимание

- **Кред дефолтного админа меняется:** вход по `admin`, не по `admin@fitcalendar.ru`.
  Предупреди всех, кто пользуется панелью.
- **Другие живые админы:** если на проде заведены ещё админы, их прежний email
  становится логином как есть (`ivan@club.ru` → логин `ivan@club.ru`). Миграция
  нормализует только дефолтного. Проверь список в шаге 4 и при желании поправь
  точечным `UPDATE ... SET login=... WHERE ...`.

## Откат

Колонка переименована — откат на старый образ без отмены миграции сломает API
(старый код ждёт `email`). Правильный откат — прогнать `down()`:

```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml exec api \
  sh -c 'touch .env.local && npm run typeorm migration:revert -- -d libs/db/src/data-source.ts'
# вернёт колонку email и login 'admin' → 'admin@fitcalendar.ru'
```

Затем `git checkout <старый-коммит>` (из шага 0) и пересобрать api/caddy как в шаге 3.

---

## Связанные документы

- `docs/deploy/deploy-steps.md` — полный деплой стека с нуля (раздел «Обновление
  после изменений в коде»)
