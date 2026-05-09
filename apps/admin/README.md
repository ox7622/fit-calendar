# Admin App

The Fit Calendar admin panel — Vite + React + Tailwind, served on port `4010` in dev.

## Running locally

```bash
# from the repo root
pnpm db:seed         # seeds the default admin user (idempotent — only inserts if not present)
pnpm nx serve admin  # http://localhost:4010
```

The API must also be running for login to work:

```bash
pnpm nx serve api    # http://localhost:3020
```

## Default seeded admin

| | |
| --- | --- |
| Email    | `admin@fitcalendar.ru` |
| Password | `admin123` |

Created by `libs/db/src/seeds/seed.ts`. The bcrypt hash baked into the seed is for this exact password — change both if you want a different default.

## Architecture

- **Routing:** `apps/admin/src/app/Router.tsx` — `/login` (public), `/dashboard` (protected via `RequireAuth` + `AdminShell`), `/` redirects to `/dashboard`, catch-all to `/login`.
- **Auth state:** `apps/admin/src/shared/stores/adminStore.ts` — Zustand store, hydrated from / written to `localStorage` (`admin_token` + `admin_user`).
- **API client:** `apps/admin/src/shared/api/client.ts` — fetch wrapper that injects `Authorization: Bearer <token>`. On 401 it clears auth and full-reloads to `${BASE_URL}login`.
- **Backend:** see `apps/api/src/modules/admin/auth/` for `AdminAuthService` (validateCredentials with constant-time bcrypt parity, signToken, recordLogin), `AdminAuthController` (`POST /admin/auth/login`, rate-limited to 5/15min), and `apps/api/src/common/guards/admin-auth.guard.ts` for `AdminAuthGuard` (used by stories 6.2–6.7).

## Production deployment notes

The story spec puts admin at `/admin/*` in production. To get there:

1. Set `base: '/admin/'` in `vite.config.ts` for the production build (`pnpm nx build admin --mode production` if you wire the conditional).
2. `BASE_URL` will then resolve to `/admin/`, so the 401-redirect logic in `client.ts` produces `/admin/login` as intended.
3. Configure the reverse proxy / hosting to mount `dist/apps/admin` at `/admin`.
