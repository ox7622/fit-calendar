# 12. Unified Project Structure

```
fitcalendar/
├── apps/
│   ├── api/                    # NestJS Backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/         # Guards, decorators, filters
│   │   │   ├── modules/        # Feature modules
│   │   │   └── config/         # Configuration
│   │   ├── test/
│   │   └── project.json
│   │
│   ├── bot/                    # Telegram Bot (grammY)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── bot.ts
│   │   │   ├── commands/       # Command handlers
│   │   │   └── middleware/     # Bot middleware
│   │   └── project.json
│   │
│   ├── mini-app/               # Telegram Mini App
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── features/
│   │   │   └── shared/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── project.json
│   │
│   └── admin/                  # Admin Panel
│       ├── src/
│       │   ├── main.tsx
│       │   ├── app/
│       │   ├── pages/
│       │   ├── features/
│       │   └── shared/
│       ├── index.html
│       ├── vite.config.ts
│       └── project.json
│
├── libs/
│   ├── shared/                 # Shared types & utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces
│   │   │   ├── constants/      # Enums, config values
│   │   │   ├── utils/          # Helper functions
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   ├── ui/                     # Shared React components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   └── project.json
│   │
│   └── db/                     # TypeORM entities & migrations
│       ├── src/
│       │   ├── entities/
│       │   ├── migrations/
│       │   ├── repositories/
│       │   └── index.ts
│       └── project.json
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── Dockerfile.api
│   ├── Dockerfile.bot
│   └── nginx/
│       └── nginx.conf
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .env.example
```

---
