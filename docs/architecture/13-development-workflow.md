# 13. Development Workflow

## 13.1 Local Setup

```bash
# Clone and install
git clone <repo>
cd fitcalendar
pnpm install

# Start database
docker compose -f docker/docker-compose.dev.yml up -d postgres

# Run migrations
pnpm nx run db:migration:run

# Start all apps in parallel
pnpm nx run-many -t serve -p api,bot,mini-app,admin
```

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
