# FitCalendar

Telegram Mini App for fitness schedule management - view classes, set reminders, and track your workouts.

## Project Structure

This is an **Nx monorepo** with the following structure:

### Applications (`apps/`)

-   **`api`** - Backend API (NestJS 11)
-   **`admin`** - Admin Panel (React + Webpack)
-   **`mini-app`** - Telegram Mini App (React + Vite)
-   **`bot`** - Telegram Bot (Node.js + grammY)

### Libraries (`libs/`)

-   **`shared`** - Shared types, constants, and utilities
-   **`db`** - TypeORM entities and migrations
-   **`ui`** - Shared React components
-   **`nest-shared`** - NestJS shared modules (DTO, decorators)
-   **`sdk`** - API client SDK
-   **`eslint-plugin`** - Custom ESLint rules

## Quick Start

### Prerequisites

-   **Node.js**: 22.13.1 (через `nvm use 22.13.1` — nx чувствителен к версии)
-   **pnpm**: latest version
-   **Docker**: for database

### Installation

```bash
nvm use 22.13.1
pnpm install
```

### Environment Setup

```bash
# Скопируй шаблон для локалки (его читает env-cmd во всех pnpm-скриптах)
cp env.local.example .env.local

# Заполни DB-креды и проверь, что VITE_API_URL=http://localhost:3020/api
# (если в файле остался Cloudflare-туннель от прошлого `pnpm dev:tunnel` —
#  верни на localhost, иначе фронт пойдёт в мёртвый туннель и логин упадёт
#  с «Неверный логин или пароль»).
```

> `.env.example` — это полный референс всех переменных (Sentry, CORS, JWT и т.п.).
> `env.local.example` — минимум для локальной разработки.

### Start Database

```bash
docker compose -f docker/docker-compose.local.yml up -d
```

### Migrations & Seed

```bash
# Прогнать миграции (без флага скрипт спросит подтверждение)
pnpm mig:up

# Засидить дефолтного админа (admin / admin123) и базовые справочники.
# Без этого шага логин в админку работать не будет.
pnpm db:seed
```

### Development

```bash
# Backend API → http://localhost:3020 (префикс /api)
pnpm nx serve api

# Admin Panel → http://localhost:4010, креды по умолчанию: admin / admin123
pnpm nx serve admin

# Mini App
pnpm nx serve mini-app

# Bot (отдельный процесс, polling-режим)
pnpm nx serve bot
```

`pnpm dev:tunnel` поднимает Cloudflare-туннель и перезаписывает `VITE_API_URL` —
нужен **только** когда тестируешь Telegram-бот (Telegram должен достучаться до
твоего localhost). Для теста admin/mini-app в браузере он не нужен.

### Testing Locally

Что хочешь проверить — определяет, что запускать.

#### Admin Panel

```bash
pnpm nx serve api
pnpm nx serve admin
```

- Открыть `http://localhost:4010` → логин `admin` / `admin123` (после `pnpm db:seed`).
- Туннель **никогда не нужен** — фронт ходит на `http://localhost:3020/api`.
- Если логин валится с «Неверный логин или пароль» — проверь `VITE_API_URL` в
  `.env.local`: должна быть `http://localhost:3020/api`, а не `*.trycloudflare.com`.

#### Mini App

Два варианта.

**1. В браузере (анонимный режим)**

```bash
pnpm nx serve api
pnpm nx serve mini-app
```

Открыть `http://localhost:4200`. Без `initData` от Telegram доступен только
**публичный каталог** (расписание/планы) — данные, привязанные к пользователю
(абонемент, напоминания), не подгрузятся. Подходит для быстрой UI-итерации.

**2. Внутри Telegram (полный флоу)**

```bash
pnpm dev:tunnel
```

Скрипт сам поднимет туннели, перезапишет env и пересоберёт mini-app. После
старта открывай чат с ботом и жми web-app кнопку. Туннели реапаются по
неактивности — скрипт это ловит и сам пересоздаёт.

⚠️ Когда закончишь, верни в `.env.local`:
```
VITE_API_URL=http://localhost:3020/api
API_URL=http://localhost:3020
```
Иначе следующий локальный запуск пойдёт в мёртвый туннель.

#### Bot

Два варианта.

**1. Только чат-команды (polling, без туннеля)**

```bash
pnpm nx serve api   # бот ходит в /api/today за данными
pnpm nx serve bot
```

Флаг `BOT_MODE=polling` в `.env.local` — бот сам подключится к Telegram и
будет получать апдейты. Тестируй `/start`, `/today`, `/week`, `/club` в чате.

⚠️ **Грабли с polling-токеном.** Если прод-бот тоже polling-ит этот же
`TELEGRAM_BOT_TOKEN`, апдейты будут гоняться между двумя listener'ами (кто
успел — тот съел). Безопасно — завести отдельного бота у `@BotFather` и
положить его токен в `.env.local`. Если в проде вебхук (не polling) —
конфликта нет.

**2. Бот + Mini App в Telegram (полный флоу)**

```bash
pnpm dev:tunnel
```

То же, что для Mini App: оба туннеля поднимаются, бот и Mini App доступны
из Telegram. Нужен, например, для тестов web-app кнопок и команд, которые
ссылаются на Mini App URL.

### Build

```bash
# Build all apps
npx nx run-many -t build

# Build specific app
npx nx build api
npx nx build admin
npx nx build mini-app
npx nx build bot
```

## Tech Stack

### Backend

-   **NestJS 11** - Node.js framework
-   **TypeORM 0.3.x** - Database ORM
-   **PostgreSQL 16** - Database
-   **grammY** - Telegram Bot framework

### Frontend

-   **React 19** - UI library
-   **Vite 6.x** - Build tool (mini-app)
-   **Webpack** - Build tool (admin)
-   **TypeScript** - Type safety

### Infrastructure

-   **Nx 21** - Monorepo management
-   **Docker** - Containerization
-   **pnpm** - Package manager

## Project Commands

```bash
# Lint all projects
npx nx run-many -t lint

# Build all projects
npx nx run-many -t build

# Show project graph
npx nx graph
```

## Documentation

See `docs/` folder for detailed documentation:

-   `docs/architecture.md` - System architecture
-   `docs/front-end-spec.md` - UI/UX specification
-   `docs/stories/` - User stories
