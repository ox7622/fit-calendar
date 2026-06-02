# Deploy runbook — Railway (API + Postgres) + Cloudflare Pages (frontends)

Backend on **Railway** (API; the Telegram webhook bot runs in-process) + a
**Railway Postgres** plugin. Frontends (Mini App, Admin) are static Vite SPAs on
**Cloudflare Pages**. No VPS, no bought domain — free subdomains, HTTPS included.

Repo deploy artifacts already committed: `railway.json`, `docker/Dockerfile.railway-api`,
`.dockerignore`, the `db:migrate:prod` script, and `main.ts` binding to `$PORT`.

---

## 0. Prerequisites

-   GitHub repo `ox7622/fit-calendar` (Railway deploys from it). Push the branch you
    want Railway to track (e.g. `feat/sprint1`, or merge to `main`).
-   A bot token from **@BotFather**.
-   API keys ready: `JWT_SECRET` (`openssl rand -base64 48`), `TELEGRAM_WEBHOOK_SECRET`
    (`openssl rand -hex 32`), Cloudinary creds, `YANDEX_GEOCODER_API_KEY`.

---

## 1. Railway — API + Postgres

1. **New Project → Deploy from GitHub repo** → pick `ox7622/fit-calendar`, branch =
   the one you pushed. Railway detects `railway.json` → builds `docker/Dockerfile.railway-api`.
2. **Add Postgres:** in the project, **New → Database → PostgreSQL**.
3. **Set the API service variables** (Settings → Variables). Map the DB from the
   Postgres plugin via references:

    | Variable                                                      | Value                                                             |
    | ------------------------------------------------------------- | ----------------------------------------------------------------- |
    | `NX_DB_HOST`                                                  | `${{Postgres.PGHOST}}`                                            |
    | `NX_DB_PORT`                                                  | `${{Postgres.PGPORT}}`                                            |
    | `NX_DB_NAME`                                                  | `${{Postgres.PGDATABASE}}`                                        |
    | `NX_DB_USER`                                                  | `${{Postgres.PGUSER}}`                                            |
    | `NX_DB_PASS`                                                  | `${{Postgres.PGPASSWORD}}`                                        |
    | `NX_DB_SCHEMA`                                                | `public`                                                          |
    | `NODE_ENV`                                                    | `production`                                                      |
    | `NX_BE_API_FITCALENDAR_SERVICE_PORT`                          | `3000` (validator needs it; app actually binds Railway's `$PORT`) |
    | `NX_BE_API_FITCALENDAR_SERVICE_PREFIX`                        | `api`                                                             |
    | `JWT_SECRET`                                                  | `<openssl rand -base64 48>`                                       |
    | `TELEGRAM_BOT_TOKEN`                                          | `<from BotFather>`                                                |
    | `TELEGRAM_WEBHOOK_SECRET`                                     | `<openssl rand -hex 32>`                                          |
    | `SWAGGER_ENABLED`                                             | `false`                                                           |
    | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET`          | `<your Cloudinary>`                                               |
    | `YANDEX_GEOCODER_API_KEY`                                     | `<your key>`                                                      |
    | `API_URL`                                                     | _(set in step 4, after the URL exists)_                           |
    | `MINI_APP_URL` / `CORS_ORIGIN_MINI_APP` / `CORS_ORIGIN_ADMIN` | _(set in step 5, after Pages)_                                    |

    > Do **not** set `BOT_MODE` (leave unset). In webhook mode the in-process bot
    > registers the webhook at `${API_URL}/api/bot/webhook` and sets the command menu
    > plus the «Меню» button on boot. Migrations run automatically on each start.

4. **Generate a public domain:** API service → Settings → Networking → **Generate Domain**
   → e.g. `https://fitcalendar-api-production.up.railway.app`. Set:
    - `API_URL` = that bare origin (no `/api`). The webhook auto-registers at `${API_URL}/api/bot/webhook`.
      Redeploy. Check logs for `Webhook registered at …/api/bot/webhook` and `Bot @… initialized`.

---

## 2. Cloudflare Pages — Mini App + Admin (two projects)

For **each** app create a Pages project from the same GitHub repo:

| Setting                | Mini App                                 | Admin                                 |
| ---------------------- | ---------------------------------------- | ------------------------------------- |
| Build command          | `pnpm install && pnpm nx build mini-app` | `pnpm install && pnpm nx build admin` |
| Build output directory | `dist/apps/mini-app`                     | `dist/apps/admin`                     |
| Root directory         | `/` (repo root)                          | `/`                                   |

Environment variables (Settings → Environment variables, Production):

-   `NODE_VERSION` = `22`
-   `VITE_API_URL` = `${API_URL}/api` (e.g. `https://fitcalendar-api-production.up.railway.app/api`)
-   _(optional)_ `VITE_SENTRY_DSN_MINI` / `VITE_SENTRY_DSN_ADMIN`, `VITE_SENTRY_ENVIRONMENT=production`

> `VITE_API_URL` is **baked at build time** — if the API URL changes, re-deploy the Pages projects.

Deploy → note the URLs, e.g. `https://fitcalendar-app.pages.dev` (Mini App) and
`https://fitcalendar-admin.pages.dev` (Admin).

---

## 3. Wire the frontend URLs back into the API (CORS + Mini App)

Back in Railway → API variables, set and redeploy:

-   `MINI_APP_URL` = `https://fitcalendar-app.pages.dev`
-   `CORS_ORIGIN_MINI_APP` = `https://fitcalendar-app.pages.dev`
-   `CORS_ORIGIN_ADMIN` = `https://fitcalendar-admin.pages.dev`

(The bot re-sets the "Меню" button + `/start` web_app button to `MINI_APP_URL` on boot.)

---

## 4. @BotFather

-   **Bot Settings → Domain** → `fitcalendar-app.pages.dev` (required for Mini App `initData` auth).
-   Menu button + command list (`today`/`tomorrow`/`week`/`club`/`start`) are set by the
    bot on boot — no manual step. Verify with the "/" menu in the chat.
-   Webhook is auto-registered. Confirm:
    `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` → `url` ends in `/api/bot/webhook`,
    empty `last_error_message`.

---

## 5. First-run data

The seed (`pnpm db:seed`) is for demo data — do **not** run it in prod. Migrations run
automatically. Create one real admin row (the seed default `admin@fitcalendar.ru` / `admin123`
must NOT be your production login). One option — run a one-off in Railway's shell:

```bash
# Railway → API service → ⋯ → Shell
node -e "console.log(require('bcrypt').hashSync(process.argv[1],10))" 'YOUR_STRONG_PW'
# then INSERT into admin_users (email, "passwordHash", name, "isActive") VALUES (...)
```

Then open Admin → Клуб → fill club info → «Определить по адресу» → Save.

---

## 6. Smoke test

-   `curl https://<api>/api/schedule/today` → 200 over HTTPS.
-   DM the bot `/start`, `/today`, `/week`, `/club` → replies; "/" menu lists commands.
-   Open the Mini App from the menu button → schedule loads (initData auth works).
-   Log into Admin with the real admin → dashboard loads.

## Rollback

Railway keeps prior deploys — **Deployments → … → Redeploy** an older one. Migrations are
not auto-reverted; plan down-migrations separately for destructive changes.
