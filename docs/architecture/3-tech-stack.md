# 3. Tech Stack

| Category           | Technology            | Version | Purpose                 |
| ------------------ | --------------------- | ------- | ----------------------- |
| Frontend Language  | TypeScript            | 5.8     | Type-safe frontend code |
| Frontend Framework | React                 | 19.0    | UI components           |
| Build Tool         | Vite                  | 6.x     | Frontend bundling       |
| UI Components      | Custom + Radix        | -       | Accessible primitives   |
| CSS Framework      | Tailwind CSS          | 3.x     | Utility-first styling   |
| State Management   | Zustand               | 5.x     | Client state            |
| Animation          | Framer Motion         | 11.x    | Gestures & animations   |
| Backend Language   | TypeScript            | 5.8     | Type-safe backend       |
| Backend Framework  | NestJS                | 11.0    | API server              |
| API Style          | REST + OpenAPI        | 3.0     | API specification       |
| Database           | PostgreSQL            | 16.x    | Primary data store      |
| ORM                | TypeORM               | 0.3.x   | Database access         |
| Bot Framework      | grammY                | 1.x     | Telegram bot            |
| Authentication     | Telegram WebApp + JWT | -       | User auth               |
| File Storage       | Cloudinary            | -       | Image optimization      |
| Frontend Testing   | Vitest                | 3.x     | Unit/component tests    |
| Backend Testing    | Jest                  | 29.x    | Unit/integration tests  |
| E2E Testing        | Playwright            | 1.x     | End-to-end tests        |
| Monorepo           | Nx                    | 21.x    | Workspace management    |
| Package Manager    | pnpm                  | 9.x     | Dependency management   |
| CI/CD              | GitHub Actions        | -       | Automated pipelines     |
| Containerization   | Docker                | -       | Deployment              |
| Logging            | Pino                  | 9.x     | Structured logging      |
| Monitoring         | Sentry                | -       | Error tracking          |
| Icons              | Lucide React          | -       | Icon library            |

## Key Technology Decisions

-   **Zustand over Redux:** Mini App needs minimal state, Zustand is ~2KB vs Redux ~30KB
-   **Vitest over Jest (frontend):** Native Vite integration, faster execution
-   **grammY over Telegraf:** TypeScript-first, modern API, active maintenance
-   **Pino over Winston:** 5x faster, JSON output, lower memory footprint
-   **No Redis initially:** In-memory cache sufficient for single instance MVP

---
