# 5. API Specification

## 5.1 Overview

**Base URL:** `/api/v1`
**Documentation:** Swagger UI at `/api/docs`

**Authentication:**

-   Mini App: Telegram `initData` in `X-Telegram-Init-Data` header
-   Admin Panel: JWT Bearer token
-   Bot: Internal service (localhost only)

## 5.2 Public & Mini App Endpoints

| Method | Endpoint                | Description               |
| ------ | ----------------------- | ------------------------- |
| GET    | `/schedule/today`       | Today's classes           |
| GET    | `/schedule/week`        | Current week's classes    |
| GET    | `/schedule/:date`       | Classes for specific date |
| GET    | `/schedule/:id`         | Single class details      |
| GET    | `/coaches`              | List active coaches       |
| GET    | `/coaches/:id`          | Coach profile             |
| GET    | `/coaches/:id/schedule` | Coach's upcoming classes  |
| GET    | `/reminders`            | User's active reminders   |
| POST   | `/reminders`            | Subscribe to reminder     |
| DELETE | `/reminders/:id`        | Cancel reminder           |
| GET    | `/users/me`             | Current user profile      |
| PUT    | `/users/settings`       | Update preferences        |
| GET    | `/club-info`            | Club details              |
| GET    | `/training-types`       | All training types        |

**Schedule Query Parameters:**

-   `difficultyLevel`, `impactType`, `coachId`, `trainingTypeId`, `includeCancelled`

## 5.3 Admin Endpoints

All require JWT authentication via `/admin/auth/login`.

| Method | Endpoint                     | Description      |
| ------ | ---------------------------- | ---------------- |
| POST   | `/admin/auth/login`          | Login            |
| GET    | `/admin/schedule`            | List classes     |
| POST   | `/admin/schedule`            | Create class     |
| PUT    | `/admin/schedule/:id`        | Update class     |
| POST   | `/admin/schedule/:id/cancel` | Cancel + notify  |
| DELETE | `/admin/schedule/:id`        | Delete class     |
| GET    | `/admin/coaches`             | List coaches     |
| POST   | `/admin/coaches`             | Create coach     |
| PUT    | `/admin/coaches/:id`         | Update coach     |
| POST   | `/admin/coaches/:id/photo`   | Upload photo     |
| PUT    | `/admin/club-info`           | Update club info |

## 5.4 Bot Webhook

| Method | Endpoint       | Description                            |
| ------ | -------------- | -------------------------------------- |
| POST   | `/bot/webhook` | Telegram updates (signature validated) |

---
