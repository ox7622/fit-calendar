# Deploy runbook — no-card free stack (Render + Neon + Cloudflare Pages)

Fully free, **no credit card**, always-on:

| Part | Service | Card? |
|---|---|---|
| Postgres | **Neon** (free, never expires) | ❌ |
| API (webhook bot in-process) | **Render** free web service (Docker) | ❌ |
| Keep API awake | **UptimeRobot** pinger (free instances sleep after 15 min) | ❌ |
| Frontends (Mini App, Admin) | **Cloudflare Pages** | ❌ |

Repo artifacts: `render.yaml`, `docker/Dockerfile.prod-api`, `db:migrate:prod`,
`main.ts` binds `$PORT`, and `NX_DB_SSL` for external TLS. Deploy branch: **`develop`**.

Secrets to have ready (generate locally):
```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # TELEGRAM_WEBHOOK_SECRET
```

---

## 1. Neon — Postgres (no card)
1. [neon.com](https://neon.com) → sign up (GitHub) → **Create project** (region close to you, e.g. EU).
2. Open **Connection Details**. From the connection string
   `postgresql://USER:PASS@HOST/DBNAME?sslmode=require` read off:
   - `NX_DB_HOST` = `HOST` (e.g. `ep-cool-name-123456.eu-central-1.aws.neon.tech`)
   - `NX_DB_PORT` = `5432`
   - `NX_DB_NAME` = `DBNAME`
   - `NX_DB_USER` = `USER`
   - `NX_DB_PASS` = `PASS`
   Use the **direct** (non-pooler) host so migrations can run DDL.

---

## 2. Render — API (no card)
1. [render.com](https://render.com) → sign up (GitHub), **no card needed** for the free tier.
2. **New → Blueprint** → pick repo `ox7622/fit-calendar`, branch **`develop`** → Render reads
   `render.yaml` and creates the `fitcalendar-api` Docker web service (free plan).
   *(Or New → Web Service → Docker, branch `develop`, dockerfile `docker/Dockerfile.prod-api`, plan Free.)*
3. **Environment** → fill the `sync:false` secrets:
   - `NX_DB_HOST` / `NX_DB_PORT` / `NX_DB_NAME` / `NX_DB_USER` / `NX_DB_PASS` — from Neon (step 1)
   - `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`
   - `YANDEX_GEOCODER_API_KEY`, `CLOUDINARY_*` (optional — uploads 503 without them)
   - leave `API_URL`, `MINI_APP_URL`, `CORS_ORIGIN_*` for now
   `NODE_ENV`, `NX_DB_SSL=true`, `SWAGGER_ENABLED=false`, ports/prefix come from `render.yaml`.
   > Do **not** set `BOT_MODE` — webhook mode; the bot registers the webhook + command
   > menu + «Меню» button on boot. Migrations run automatically each start.
4. First deploy builds the image, then **fails at start** (no `API_URL`/CORS yet) — that's expected.
5. Copy the service URL (e.g. `https://fitcalendar-api.onrender.com`). Set
   `API_URL` = that bare origin (no `/api`) → save → it redeploys. Logs should show
   `Bot @… initialized` and `Webhook registered at …/api/bot/webhook`.

---

## 3. UptimeRobot — keep it awake (no card)
Render free sleeps after 15 min idle (cold start ~1 min → the bot would miss/delay updates).
1. [uptimerobot.com](https://uptimerobot.com) → free account.
2. **Add New Monitor** → HTTP(s) → URL `https://fitcalendar-api.onrender.com/api/schedule/today`
   → interval **5 min** → Create. This keeps the instance warm 24/7.

---

## 4. Cloudflare Pages — Mini App + Admin (no card)
Two projects from the same repo (branch `develop`):

| Setting | Mini App | Admin |
|---|---|---|
| Build command | `pnpm install && pnpm nx build mini-app` | `pnpm install && pnpm nx build admin` |
| Output dir | `dist/apps/mini-app` | `dist/apps/admin` |
| Env `NODE_VERSION` | `22` | `22` |
| Env `VITE_API_URL` | `https://fitcalendar-api.onrender.com/api` | same |

Deploy → note URLs, e.g. `https://fitcalendar-app.pages.dev`, `https://fitcalendar-admin.pages.dev`.
(`VITE_API_URL` is baked at build — re-deploy Pages if the API URL changes.)

---

## 5. Wire frontend URLs back into Render
Render → fitcalendar-api → Environment, set + redeploy:
- `MINI_APP_URL` = `https://fitcalendar-app.pages.dev`
- `CORS_ORIGIN_MINI_APP` = `https://fitcalendar-app.pages.dev`
- `CORS_ORIGIN_ADMIN` = `https://fitcalendar-admin.pages.dev`

---

## 6. @BotFather
- **Bot Settings → Domain** → `fitcalendar-app.pages.dev` (Mini App `initData` auth).
- Commands menu + «Меню» button are set by the bot on boot — just verify in the chat.
- `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"` → url ends `/api/bot/webhook`, no error.

---

## 7. First admin + smoke test
- Don't run `db:seed` (demo data + `admin123`). Migrations auto-run. Create a real admin:
  Render → service → **Shell** →
  `node -e "console.log(require('bcrypt').hashSync('YOUR_PW',10))"` → `INSERT INTO admin_users …`.
- Smoke: `curl https://<api>/api/schedule/today` → 200; bot `/start` `/today` `/club`;
  open Mini App from the menu button; log into Admin → Клуб → «Определить по адресу».

## Notes / gotchas
- Render free = 512 MB RAM. If the boot-time ts-node migration OOMs, run it once via
  Render **Shell** (`pnpm db:migrate:prod`) and change the start command to just
  `node dist/apps/api/main.js`.
- Free instance = 750 hours/month — fine for one always-on service.
