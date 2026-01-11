# FitCalendar

Telegram Mini App for fitness schedule management - view classes, set reminders, and track your workouts.

## Project Structure

This is an **Nx monorepo** with the following structure:

### Applications (`apps/`)

- **`api`** - Backend API (NestJS 11)
- **`admin`** - Admin Panel (React + Webpack)
- **`mini-app`** - Telegram Mini App (React + Vite)
- **`bot`** - Telegram Bot (Node.js + grammY)

### Libraries (`libs/`)

- **`shared`** - Shared types, constants, and utilities
- **`db`** - TypeORM entities and migrations
- **`ui`** - Shared React components
- **`nest-shared`** - NestJS shared modules (DTO, decorators)
- **`sdk`** - API client SDK
- **`eslint-plugin`** - Custom ESLint rules

## Quick Start

### Prerequisites

- **Node.js**: 22.x
- **pnpm**: latest version
- **Docker**: for database

### Installation

```bash
pnpm install
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
```

### Start Database

```bash
docker compose -f docker/docker-compose.local.yml up -d
```

### Development

```bash
# Start API
npx nx serve api

# Start Admin Panel
npx nx serve admin

# Start Mini App
npx nx serve mini-app

# Start Bot
npx nx serve bot
```

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
- **NestJS 11** - Node.js framework
- **TypeORM 0.3.x** - Database ORM
- **PostgreSQL 16** - Database
- **grammY** - Telegram Bot framework

### Frontend
- **React 19** - UI library
- **Vite 6.x** - Build tool (mini-app)
- **Webpack** - Build tool (admin)
- **TypeScript** - Type safety

### Infrastructure
- **Nx 21** - Monorepo management
- **Docker** - Containerization
- **pnpm** - Package manager

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
- `docs/architecture.md` - System architecture
- `docs/front-end-spec.md` - UI/UX specification
- `docs/stories/` - User stories
