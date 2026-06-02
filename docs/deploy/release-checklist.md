# Release Checklist

Pre-flight, deploy, and post-deploy steps for shipping the API + admin + mini-app.
Run through this list every release. The manual smoke pass after deploy is at
[`manual-smoke-runbook.md`](./manual-smoke-runbook.md).

## 1. Pre-flight (local, before pushing the release tag)

-   [ ] `pnpm install` clean (no lockfile drift)
-   [ ] `pnpm nx run-many -t lint build test` — all three green
-   [ ] Migrations: `pnpm mig:list` shows the new ones the release will run; no `[ ]` rows from older releases left over locally
-   [ ] `git status` clean; release branch is up to date with `develop`

## 2. Environment variables

Source of truth is [`.env.example`](../../.env.example). Production must define
**all** of these or the API will fail at boot or first request:

### Required at boot (fail-fast via class-validator)

| Var | Used by | Notes |
|---|---|---|
| `NX_DB_HOST` / `NX_DB_PORT` / `NX_DB_NAME` / `NX_DB_USER` / `NX_DB_PASS` | API | TypeORM connection. Use the read-write role; migrations need DDL. |
| `JWT_SECRET` | API (admin auth) | ≥ 32 chars, no placeholder tokens (`replace-me`, `changeme`, etc.) — env validator refuses to boot in `NODE_ENV=production` if any of those substrings are present. Generate with `openssl rand -base64 48`. |
| `TELEGRAM_BOT_TOKEN` | API (bot + reminders) | From `@BotFather`. Without it, reminders + change/cancel notifications will throw `BotNotInitializedError` and the dispatcher will keep retrying. |
| `TELEGRAM_WEBHOOK_SECRET` | API (bot webhook) | Signature validation for `POST /bot/webhook`. |
| `NX_BE_API_FITCALENDAR_SERVICE_PORT` / `NX_BE_API_FITCALENDAR_SERVICE_PREFIX` | API | `3020` and `api` are the dev defaults; production usually fronts behind a reverse proxy on 80/443. |

### Required for full functionality (no fail-fast, but features silently break)

| Var | Used by | Failure mode if missing |
|---|---|---|
| `MINI_APP_URL` | API (reminder dispatcher, 5.4/5.5 listeners) | Telegram notifications will skip the inline "📅 Открыть" button. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | API (`/admin/coaches/:id/photo`, `/admin/club-info/logo`) | Upload endpoints return **503 with a Russian message**; existing photos still serve. Acceptable in dev, **not in prod** — surface in admin before launch. |
| `CORS_ORIGIN_MINI_APP` / `CORS_ORIGIN_ADMIN` | API | Browser requests from the configured domains get blocked by CORS. |
| `API_URL` | API | Used by the bot to register the Telegram webhook (`{API_URL}/bot/webhook`). |
| `VITE_API_URL` | Mini-app + admin builds | Baked into the bundle at build time, not runtime — rebuild + redeploy the frontends if it changes. |
| `LOG_LEVEL` | API | Defaults to `info`. |
| `SWAGGER_ENABLED` | API | Default `true`. Set to `false` in production so the API schema isn't publicly discoverable. |
| `NX_DB_POOL_MAX` / `NX_DB_STATEMENT_TIMEOUT_MS` / `NX_DB_IDLE_TX_TIMEOUT_MS` | API | Defaults: 10, 30000, 60000. Tune `NX_DB_POOL_MAX` proportionally when scaling out replicas. |
| `VITE_SENTRY_DSN_ADMIN` / `VITE_SENTRY_DSN_MINI` | Admin / Mini-app builds | Without these, Sentry init no-ops; frontend errors stay invisible. Baked at build time — rebuild + redeploy frontends if changed. |
| `VITE_SENTRY_ENVIRONMENT` / `VITE_SENTRY_RELEASE` | Admin / Mini-app builds | Optional labels forwarded to Sentry; default to Vite `MODE`. |

> Both Cloudinary credentials and `TELEGRAM_BOT_TOKEN` are technically optional at boot
> for ergonomics during local dev. In **production** treat them as required and check
> their presence in the deploy script before flipping traffic.

## 3. Database migrations

Migrations live in `libs/db/src/migrations/`. The order is timestamp-prefixed.

```bash
# Inspect what would run
pnpm mig:list

# Apply (the script prompts "yes" — pipe it in if non-interactive)
echo "yes" | pnpm mig:up
```

**Rules:**

-   Migrations are forward-only. We do not run `mig:down` in production.
-   Run migrations **before** swapping API traffic. The new code expects the new schema; the old code tolerates the new columns (new columns are nullable or have defaults).
-   For a schema change that's _not_ backward-compatible (drops, renames), ship the read-tolerant version first, deploy, then ship the migration in the next release. This sprint added only additive migrations (`AddCustomerMemberships`, `AddGuestVisits`, `AddFreezeEvents`) — all safe to run in any order relative to the API swap.

## 4. Build

```bash
pnpm nx run-many -t build --projects=api,admin,mini-app
```

Outputs land in `dist/apps/{api,admin,mini-app}/`. The admin + mini-app are static
Vite bundles; the API is a Node bundle that needs `node dist/apps/api/main.js`.

## 5. Deploy order

1. **Migrate the DB.**
2. **Deploy the API** (new image) — it boots, validates env, runs the daily cron registrations.
3. **Deploy the mini-app + admin** static bundles — Cache headers should let them invalidate aggressively (no long-cached HTML pointing at old JS hashes).
4. **Re-register the bot webhook** (happens automatically at API boot if `API_URL` + `TELEGRAM_WEBHOOK_SECRET` are present — confirm in the API logs: `Webhook registered at ...`).

## 6. Post-deploy smoke

Run through [`manual-smoke-runbook.md`](./manual-smoke-runbook.md). Each section maps
to a story; tick off the boxes as you go. The runbook covers what would otherwise be
the "Manual smoke" Task N items that are unticked in every story file.

## 7. Rollback

If the API has a regression:

1. Re-deploy the previous image. The new migrations are additive, so the old code reads the new schema fine (it just won't write to the new columns).
2. If the regression is in a frontend, re-deploy the previous static bundle.
3. **Do not** roll the migrations back unless you're certain no data has been written to the new columns. If memberships, freezes, or guest visits exist, dropping their tables loses data.

## 8. Known gaps to watch for (track in issues, not blockers)

-   **Single-instance API only.** `ReminderDispatcherService.isProcessing` is an in-memory boolean; running ≥2 replicas causes duplicate sends. Before scaling out, swap to `pg_try_advisory_lock`.
-   **Out-of-band notifications don't persist retry state** (5.4/5.5). API restart mid-retry → user misses the message but sees the corrected state in the Mini App on next fetch.
-   **Reminder dispatcher is unaware of freezes** (7.6). Frozen members still get reminders for classes during the freeze window.
-   **Admin audit log has no UI yet.** Destructive admin actions write to the `admin_audit_log` table (see Hardening Pass 2). Admins read it via SQL until a panel ships.
-   **`pnpm audit` gate in CI is set to `--audit-level=critical`.** Baseline has 13 high-severity transitive advisories that need coordinated upstream bumps (typeorm, multer, path-to-regexp). Ratchet to `high` after the next dep-bump round.

> Resolved in Hardening Pass 2: the `cancel()` (6.4) and `assign()` (7.4) row-lock gaps that used to live here. Both ship a `pessimistic_write` lock today, plus the `uq_active_membership_per_customer` unique partial index as defense in depth.

All items above are documented in the relevant story Dev Notes; this list is for ops awareness.
