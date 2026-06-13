# 13. Development Workflow

## 13.1 Local Setup

```bash
# Clone and install (Node 22.13.1 обязателен — nx падает на других минорах)
git clone <repo>
cd fitcalendar
nvm use 22.13.1
pnpm install

# Env: env-cmd во всех pnpm-скриптах читает .env.local (не .env)
cp env.local.example .env.local
# Проверь: VITE_API_URL=http://localhost:3020/api (а не Cloudflare-туннель)

# Database
docker compose -f docker/docker-compose.local.yml up -d postgres

# Миграции и сид (без сида в admin не залогиниться)
pnpm mig:up
pnpm db:seed   # создаёт admin / admin123

# Запуск (порты: api 3020, admin 4010, mini-app — стандартный Vite)
pnpm nx run-many -t serve -p api,bot,mini-app,admin
```

## 13.1.1 Сценарии локального тестирования

| Что проверяем             | Команды                                    | Доступ              | Туннель |
| ------------------------- | ------------------------------------------ | ------------------- | ------- |
| Админка                   | `nx serve api` + `nx serve admin`          | `localhost:4010`    | нет     |
| Mini App (UI, анонимно)   | `nx serve api` + `nx serve mini-app`       | `localhost:4200`    | нет     |
| Mini App внутри Telegram  | `pnpm dev:tunnel`                          | web-app кнопка бота | да      |
| Бот (только чат-команды)  | `nx serve api` + `nx serve bot`            | чат с ботом         | нет     |
| Бот + Mini App в Telegram | `pnpm dev:tunnel`                          | чат + web-app       | да      |

**Грабли, которые легко поймать:**

- **Mini App без Telegram** — `initData` отсутствует, и пользовательский флоу
  (абонемент, напоминания) недоступен; виден только публичный каталог. Это
  нормально для UI-итерации.
- **Polling-конфликт бота** — если прод-бот тоже polling-ит тот же
  `TELEGRAM_BOT_TOKEN`, апдейты будут гоняться между двумя listener'ами.
  Решение: завести отдельного dev-бота через `@BotFather`.
- **После `pnpm dev:tunnel`** — скрипт перезаписывает `VITE_API_URL` /
  `API_URL` / `CORS_ORIGIN_MINI_APP` / `MINI_APP_URL` в `.env.local` на
  Cloudflare-туннели. Туннели одноразовые. После теста верни URL-ы на
  `http://localhost:3020(/api)`, иначе следующий локальный запуск пойдёт
  в мёртвый туннель и логин будет валиться универсальным «Неверный логин
  или пароль».

## 13.2 Nx Commands

| Command               | Description               |
| --------------------- | ------------------------- |
| `nx serve api`        | Start API in dev mode     |
| `nx serve mini-app`   | Start Mini App dev server |
| `nx build api --prod` | Production build          |
| `nx test api`         | Run API tests             |
| `nx lint mini-app`    | Lint Mini App             |
| `nx affected -t test` | Test affected projects    |
| `nx graph`            | Visualize dependencies    |

## 13.3 Git Workflow

**Branches:**

-   `main` — Production releases
-   `develop` — Integration branch
-   `feature/*` — Feature branches
-   `fix/*` — Bug fixes

**Commit Convention:**

```
<type>(<scope>): <description>

feat(schedule): add filter by coach
fix(reminders): correct timezone handling
docs(api): update swagger descriptions
```

---
