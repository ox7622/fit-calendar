# 1. Introduction

This document outlines the complete fullstack architecture for **FitCalendar**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

## 1.1 Starter Template / Existing Project

**Base:** Existing Nx monorepo starter with NestJS + React

**Adaptations Required:**

-   Migrate frontend bundler from Webpack to Vite
-   Keep TypeORM (existing migrations infrastructure)
-   Rename and restructure apps to match PRD requirements

**App Restructuring:**

| Current       | New Name   | Purpose                          |
| ------------- | ---------- | -------------------------------- |
| `fe-main`     | `admin`    | Admin Panel (React + Vite)       |
| `be-api-main` | `api`      | NestJS Backend API               |
| _(new)_       | `mini-app` | Telegram Mini App (React + Vite) |
| _(new)_       | `bot`      | Telegram Bot (grammY)            |

**Retained from Starter:**

-   Nx 21 workspace configuration
-   NestJS 11 with TypeORM
-   PostgreSQL database setup
-   Docker Compose for local development
-   ESLint + Prettier configuration
-   Commit conventions (commitlint, husky)

## 1.2 Change Log

| Date       | Version | Description                   | Author              |
| ---------- | ------- | ----------------------------- | ------------------- |
| 2026-01-09 | 1.0     | Initial Architecture Document | Winston (Architect) |

---
