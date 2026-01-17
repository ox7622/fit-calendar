# FitCalendar Fullstack Architecture Document

## 1. Introduction

This document outlines the complete fullstack architecture for **FitCalendar**, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### 1.1 Starter Template / Existing Project

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

### 1.2 Change Log

| Date       | Version | Description                   | Author              |
| ---------- | ------- | ----------------------------- | ------------------- |
| 2026-01-09 | 1.0     | Initial Architecture Document | Winston (Architect) |

---

## 2. High-Level Architecture

### 2.1 Technical Summary

FitCalendar is a hybrid Telegram application combining a Bot for quick interactions, a Mini App for rich schedule browsing, and an Admin Panel for club management. The architecture follows a monolithic API pattern with multiple client applications, deployed as containerized services.

The system uses NestJS as a unified backend serving REST APIs to all clients, with TypeORM managing PostgreSQL data. Two React + Vite frontends (Mini App and Admin) share a common UI component library. The grammY bot framework handles Telegram interactions via webhooks. Cloudinary provides image optimization for coach photos.

### 2.2 Platform and Infrastructure

**Platform:** VPS (DigitalOcean/Hetzner) with Docker Compose
**Key Services:** PostgreSQL, Nginx (reverse proxy), Cloudinary (images)
**Regions:** Single region (Europe - targeting Russian market)

**Rationale:** PRD targets 500 concurrent users — VPS handles this with predictable cost (~$20-40/month). Docker already configured in starter. Can migrate to managed platforms later if needed.

### 2.3 Repository Structure

**Structure:** Monorepo (existing Nx workspace)
**Monorepo Tool:** Nx 21 with pnpm workspaces

```
fitcalendar/
├── apps/           # Deployable applications
│   ├── api/        # NestJS backend
│   ├── bot/        # Telegram bot (grammY)
│   ├── mini-app/   # Telegram Mini App (React + Vite)
│   └── admin/      # Admin Panel (React + Vite)
├── libs/           # Shared libraries
│   ├── shared/     # Types, constants, utilities
│   ├── ui/         # Shared React components
│   └── db/         # TypeORM entities & migrations
└── docker/         # Docker configurations
```

### 2.4 Architecture Diagram

```mermaid
graph TB
    subgraph "Telegram Platform"
        TG_USER[Telegram User]
        TG_BOT_API[Telegram Bot API]
    end

    subgraph "Client Applications"
        MINI_APP[Mini App<br/>React + Vite]
        BOT[Bot Service<br/>grammY]
        ADMIN[Admin Panel<br/>React + Vite]
    end

    subgraph "Backend Services"
        API[NestJS API<br/>REST + Swagger]
        NGINX[Nginx<br/>Reverse Proxy]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL)]
        CLOUD[Cloudinary<br/>Images]
    end

    TG_USER -->|Opens Mini App| MINI_APP
    TG_USER -->|Bot Commands| TG_BOT_API
    TG_BOT_API -->|Webhook| BOT
    BOT -->|Sends Messages| TG_BOT_API

    MINI_APP -->|REST API| NGINX
    BOT -->|REST API| API
    ADMIN -->|REST API| NGINX

    NGINX --> API
    API --> PG
    API --> CLOUD
```

### 2.5 Architectural Patterns

-   **Monolithic API:** Single NestJS service handles all business logic — appropriate for MVP scale
-   **Module-Based Backend:** NestJS modules for domain separation (schedule, coaches, users, reminders)
-   **Shared Component Library:** Common UI components in `libs/ui` for consistent design
-   **Repository Pattern:** TypeORM repositories abstract data access
-   **Webhook-Based Bot:** grammY with webhook mode for production efficiency
-   **API-First Design:** OpenAPI/Swagger documentation generated from decorators

---

## 3. Tech Stack

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

### Key Technology Decisions

-   **Zustand over Redux:** Mini App needs minimal state, Zustand is ~2KB vs Redux ~30KB
-   **Vitest over Jest (frontend):** Native Vite integration, faster execution
-   **grammY over Telegraf:** TypeScript-first, modern API, active maintenance
-   **Pino over Winston:** 5x faster, JSON output, lower memory footprint
-   **No Redis initially:** In-memory cache sufficient for single instance MVP

---

## 4. Data Models

### 4.1 Entity Overview

| Entity            | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| **User**          | Telegram user interacting with Mini App/Bot       |
| **Coach**         | Fitness instructor who teaches classes            |
| **TrainingType**  | Definition of a class type with difficulty/impact |
| **ScheduleEntry** | Specific class instance on the schedule           |
| **Reminder**      | User subscription for class notification          |
| **ClubInfo**      | Singleton with club contact information           |
| **AdminUser**     | Staff member with admin panel access              |

### 4.2 TypeScript Interfaces

```typescript
// User - Telegram user
interface User {
    id: string;
    telegramId: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
    reminderMinutes: number; // default: 30
    createdAt: Date;
    updatedAt: Date;
}

// Coach - Fitness instructor
interface Coach {
    id: string;
    name: string;
    bio: string | null;
    photoUrl: string | null;
    specializations: string[];
    certifications: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// TrainingType - Class definition
interface TrainingType {
    id: string;
    name: string;
    description: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    impactTypes: ('cardio' | 'strength' | 'flexibility' | 'balance')[];
    equipment: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ScheduleEntry - Specific class instance
interface ScheduleEntry {
    id: string;
    trainingTypeId: string;
    coachId: string;
    startTime: Date;
    durationMinutes: number;
    status: 'scheduled' | 'cancelled';
    cancellationReason: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Reminder - Notification subscription
interface Reminder {
    id: string;
    userId: string;
    scheduleEntryId: string;
    notifyAt: Date;
    status: 'pending' | 'sent' | 'failed';
    sentAt: Date | null;
    createdAt: Date;
}

// ClubInfo - Singleton
interface ClubInfo {
    id: string;
    name: string;
    address: string;
    phone: string;
    workingHours: Record<string, { open: string; close: string } | null>;
    latitude: number | null;
    longitude: number | null;
    logoUrl: string | null;
    updatedAt: Date;
}

// AdminUser - Staff member
interface AdminUser {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
```

### 4.3 Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Reminder : "has"
    Coach ||--o{ ScheduleEntry : "teaches"
    TrainingType ||--o{ ScheduleEntry : "defines"
    ScheduleEntry ||--o{ Reminder : "has"

    User {
        uuid id PK
        bigint telegramId UK
        string firstName
        int reminderMinutes
    }

    Coach {
        uuid id PK
        string name
        string photoUrl
        boolean isActive
    }

    TrainingType {
        uuid id PK
        string name
        enum difficulty
        array impactTypes
    }

    ScheduleEntry {
        uuid id PK
        uuid trainingTypeId FK
        uuid coachId FK
        timestamp startTime
        enum status
    }

    Reminder {
        uuid id PK
        uuid userId FK
        uuid scheduleEntryId FK
        enum status
    }
```

---

## 5. API Specification

### 5.1 Overview

**Base URL:** `/api/v1`
**Documentation:** Swagger UI at `/api/docs`

**Authentication:**

-   Mini App: Telegram `initData` in `X-Telegram-Init-Data` header
-   Admin Panel: JWT Bearer token
-   Bot: Internal service (localhost only)

### 5.2 Public & Mini App Endpoints

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

### 5.3 Admin Endpoints

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

### 5.4 Bot Webhook

| Method | Endpoint       | Description                            |
| ------ | -------------- | -------------------------------------- |
| POST   | `/bot/webhook` | Telegram updates (signature validated) |

---

## 6. Components

### 6.1 Backend Modules (NestJS)

| Module                 | Purpose                                 | Dependencies                    |
| ---------------------- | --------------------------------------- | ------------------------------- |
| **ScheduleModule**     | Classes CRUD, filtering, date queries   | CoachModule, TrainingTypeModule |
| **CoachModule**        | Coach management, photo uploads         | CloudinaryModule                |
| **ReminderModule**     | Reminder subscriptions, status tracking | ScheduleModule, UserModule      |
| **NotificationModule** | Send reminders via Telegram             | BotModule, ReminderModule       |
| **AuthModule**         | JWT + Telegram initData validation      | UserModule                      |
| **UserModule**         | User profile, settings                  | -                               |
| **BotModule**          | grammY bot, webhook handler             | All modules                     |
| **AdminModule**        | Admin CRUD operations                   | All modules                     |
| **ClubInfoModule**     | Club details singleton                  | -                               |
| **TrainingTypeModule** | Training type management                | -                               |

### 6.2 Frontend Components (Mini App)

**Core Layout:**

-   `AppShell` — Main layout with navigation
-   `BottomNav` — Tab bar (Schedule, Coaches, Reminders, Club)
-   `Header` — Date selector, filters

**Schedule:**

-   `ScheduleView` — Day/week toggle with class list
-   `ClassCard` — Individual class display
-   `ClassDetails` — Full class info modal
-   `FilterSheet` — Bottom sheet with filters

**Coaches:**

-   `CoachList` — Grid of coach cards
-   `CoachCard` — Coach photo, name, specializations
-   `CoachProfile` — Full profile with schedule

**Reminders:**

-   `ReminderList` — User's active reminders
-   `ReminderCard` — Single reminder with cancel action

**Club:**

-   `ClubInfo` — Contact details, map, hours

### 6.3 Frontend Components (Admin Panel)

**Layout:**

-   `AdminLayout` — Sidebar + main content
-   `Sidebar` — Navigation menu
-   `TopBar` — User menu, notifications

**Schedule Management:**

-   `ScheduleCalendar` — Weekly calendar view
-   `ClassForm` — Create/edit class modal
-   `BulkScheduler` — Recurring class creation

**Coach Management:**

-   `CoachTable` — Data table with actions
-   `CoachForm` — Create/edit coach
-   `PhotoUploader` — Cloudinary integration

**Settings:**

-   `ClubInfoForm` — Edit club details
-   `AdminUserTable` — Manage admin users

### 6.4 Shared Library (libs/ui)

**Primitives:**

-   `Button`, `Input`, `Select`, `Checkbox`
-   `Card`, `Modal`, `Sheet`, `Toast`
-   `Avatar`, `Badge`, `Spinner`

**Layout:**

-   `Container`, `Stack`, `Grid`
-   `Divider`, `Spacer`

**Feedback:**

-   `Alert`, `Skeleton`, `EmptyState`

---

## 7. External APIs

### 7.1 Telegram Bot API

**Purpose:** Bot commands, notifications, Mini App launch

**Integration:**

```typescript
// grammY bot setup
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Webhook mode for production
bot.api.setWebhook(`${DOMAIN}/api/bot/webhook`);
```

**Key Methods Used:**
| Method | Purpose |
|--------|---------|
| `sendMessage` | Reminder notifications |
| `answerCallbackQuery` | Inline button responses |
| `setWebhook` | Register webhook URL |
| `getMe` | Verify bot connection |

**Bot Commands:**
| Command | Description |
|---------|-------------|
| `/start` | Welcome + Mini App button |
| `/schedule` | Today's classes (inline) |
| `/reminders` | Active reminders list |
| `/help` | Command reference |

### 7.2 Telegram WebApp SDK

**Purpose:** Mini App authentication, native features

**Integration:**

```typescript
// Frontend initialization
import WebApp from '@twa-dev/sdk';

WebApp.ready();
WebApp.expand();

// Get init data for API auth
const initData = WebApp.initData;

// Theme sync
const colorScheme = WebApp.colorScheme; // 'dark' | 'light'
```

**Features Used:**
| Feature | Purpose |
|---------|---------|
| `initData` | User authentication |
| `colorScheme` | Theme detection |
| `MainButton` | Primary CTA |
| `BackButton` | Navigation |
| `HapticFeedback` | Touch feedback |
| `openLink` | External links |

### 7.3 Cloudinary API

**Purpose:** Coach photo storage and optimization

**Integration:**

```typescript
// Backend upload
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload with transformations
const result = await cloudinary.uploader.upload(file.path, {
    folder: 'fitcalendar/coaches',
    transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
    ],
});
```

**Transformations:**
| Use Case | Transformation |
|----------|----------------|
| Coach avatar (list) | 100x100, face crop |
| Coach profile | 400x400, face crop |
| Thumbnail | 50x50, face crop |

### 7.4 Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fitcalendar

# JWT
JWT_SECRET=xxx
JWT_EXPIRES_IN=7d

# App
NODE_ENV=production
API_URL=https://api.fitcalendar.ru
```

---

## 8. Core Workflows

### 8.1 User Views Schedule

```mermaid
sequenceDiagram
    participant U as User
    participant MA as Mini App
    participant API as NestJS API
    participant DB as PostgreSQL

    U->>MA: Opens Mini App
    MA->>MA: WebApp.ready()
    MA->>API: GET /schedule/today
    Note over MA,API: X-Telegram-Init-Data header
    API->>API: Validate initData
    API->>DB: Query schedule + joins
    DB-->>API: ScheduleEntry[]
    API-->>MA: Classes with coach & type
    MA-->>U: Render schedule
```

### 8.2 User Sets Reminder

```mermaid
sequenceDiagram
    participant U as User
    participant MA as Mini App
    participant API as NestJS API
    participant DB as PostgreSQL

    U->>MA: Tap "Remind Me"
    MA->>API: POST /reminders
    Note over MA,API: { scheduleEntryId, notifyAt }
    API->>DB: Check existing reminder
    alt Already subscribed
        API-->>MA: 409 Conflict
        MA-->>U: "Already subscribed"
    else New reminder
        API->>DB: INSERT reminder
        DB-->>API: Reminder created
        API-->>MA: 201 Created
        MA-->>U: "Reminder set!"
    end
```

### 8.3 Reminder Notification Sent

```mermaid
sequenceDiagram
    participant CRON as Scheduler
    participant API as NestJS API
    participant DB as PostgreSQL
    participant BOT as Bot Service
    participant TG as Telegram API

    CRON->>API: Trigger every minute
    API->>DB: SELECT pending reminders
    Note over API,DB: WHERE notifyAt <= NOW()
    DB-->>API: Reminder[]
    loop Each reminder
        API->>BOT: Send notification
        BOT->>TG: sendMessage
        TG-->>BOT: Success
        BOT-->>API: Sent
        API->>DB: UPDATE status = 'sent'
    end
```

### 8.4 Admin Cancels Class

```mermaid
sequenceDiagram
    participant A as Admin
    participant AP as Admin Panel
    participant API as NestJS API
    participant DB as PostgreSQL
    participant BOT as Bot Service
    participant TG as Telegram API

    A->>AP: Click "Cancel Class"
    AP->>AP: Show reason modal
    A->>AP: Enter reason, confirm
    AP->>API: POST /admin/schedule/:id/cancel
    API->>DB: UPDATE status = 'cancelled'
    API->>DB: SELECT affected reminders
    DB-->>API: Reminder[] with users
    loop Each affected user
        API->>BOT: Send cancellation
        BOT->>TG: sendMessage
        Note over BOT,TG: "Class cancelled: {reason}"
    end
    API-->>AP: Success
    AP-->>A: "Class cancelled, users notified"
```

---

## 9. Database Schema

### 9.1 PostgreSQL Tables

```sql
-- Users (Telegram users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    username VARCHAR(255),
    reminder_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaches
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    photo_url VARCHAR(500),
    specializations TEXT[] DEFAULT '{}',
    certifications TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training Types
CREATE TABLE training_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    impact_types TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedule Entries
CREATE TABLE schedule_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    training_type_id UUID REFERENCES training_types(id),
    coach_id UUID REFERENCES coaches(id),
    start_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reminders
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    schedule_entry_id UUID REFERENCES schedule_entries(id) ON DELETE CASCADE,
    notify_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, schedule_entry_id)
);

-- Club Info (singleton)
CREATE TABLE club_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    working_hours JSONB DEFAULT '{}',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    logo_url VARCHAR(500),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 9.2 Indexes

```sql
-- Schedule queries
CREATE INDEX idx_schedule_start_time ON schedule_entries(start_time);
CREATE INDEX idx_schedule_coach ON schedule_entries(coach_id);
CREATE INDEX idx_schedule_type ON schedule_entries(training_type_id);
CREATE INDEX idx_schedule_status ON schedule_entries(status);

-- Reminder processing
CREATE INDEX idx_reminders_notify_at ON reminders(notify_at) WHERE status = 'pending';
CREATE INDEX idx_reminders_user ON reminders(user_id);

-- User lookup
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
```

---

## 10. Frontend Architecture

### 10.1 Mini App Structure

```
apps/mini-app/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── Router.tsx
│   │   └── providers/
│   │       ├── ThemeProvider.tsx
│   │       └── QueryProvider.tsx
│   ├── pages/
│   │   ├── SchedulePage.tsx
│   │   ├── CoachesPage.tsx
│   │   ├── CoachProfilePage.tsx
│   │   ├── RemindersPage.tsx
│   │   └── ClubPage.tsx
│   ├── features/
│   │   ├── schedule/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── api/
│   │   ├── coaches/
│   │   ├── reminders/
│   │   └── club/
│   ├── shared/
│   │   ├── api/
│   │   │   └── client.ts
│   │   ├── hooks/
│   │   └── utils/
│   └── main.tsx
├── index.html
└── vite.config.ts
```

### 10.2 State Management (Zustand)

```typescript
// stores/userStore.ts
interface UserState {
    user: User | null;
    reminderMinutes: number;
    setUser: (user: User) => void;
    setReminderMinutes: (minutes: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    reminderMinutes: 30,
    setUser: (user) => set({ user }),
    setReminderMinutes: (minutes) => set({ reminderMinutes: minutes }),
}));

// stores/filterStore.ts
interface FilterState {
    difficulty: Difficulty | null;
    impactType: ImpactType | null;
    coachId: string | null;
    setFilters: (filters: Partial<FilterState>) => void;
    clearFilters: () => void;
}
```

### 10.3 API Client

```typescript
// shared/api/client.ts
import WebApp from '@twa-dev/sdk';

const API_BASE = import.meta.env.VITE_API_URL;

export const apiClient = {
    async get<T>(path: string): Promise<T> {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: {
                'X-Telegram-Init-Data': WebApp.initData,
            },
        });
        if (!res.ok) throw new ApiError(res);
        return res.json();
    },

    async post<T>(path: string, data: unknown): Promise<T> {
        const res = await fetch(`${API_BASE}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': WebApp.initData,
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new ApiError(res);
        return res.json();
    },
};
```

### 10.4 Theme Integration

```typescript
// providers/ThemeProvider.tsx
import WebApp from '@twa-dev/sdk';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>(WebApp.colorScheme || 'light');

    useEffect(() => {
        // Listen for Telegram theme changes
        WebApp.onEvent('themeChanged', () => {
            setTheme(WebApp.colorScheme);
        });
    }, []);

    return <div className={`theme-${theme}`}>{children}</div>;
}
```

---

## 11. Backend Architecture

### 11.1 NestJS Module Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   └── telegram-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── telegram-auth.guard.ts
│   │   │   └── jwt-auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   ├── modules/
│   │   ├── schedule/
│   │   │   ├── schedule.module.ts
│   │   │   ├── schedule.controller.ts
│   │   │   ├── schedule.service.ts
│   │   │   └── dto/
│   │   ├── coach/
│   │   ├── reminder/
│   │   ├── notification/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── bot/
│   │   ├── admin/
│   │   ├── club-info/
│   │   └── training-type/
│   └── config/
│       ├── database.config.ts
│       └── telegram.config.ts
└── test/
```

### 11.2 Telegram Auth Guard

```typescript
// common/guards/telegram-auth.guard.ts
@Injectable()
export class TelegramAuthGuard implements CanActivate {
    constructor(private userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const initData = request.headers['x-telegram-init-data'];

        if (!initData) {
            throw new UnauthorizedException('Missing Telegram init data');
        }

        // Validate initData signature
        const isValid = this.validateInitData(initData);
        if (!isValid) {
            throw new UnauthorizedException('Invalid Telegram init data');
        }

        // Parse user data and attach to request
        const userData = this.parseInitData(initData);
        request.telegramUser = await this.userService.upsert(userData);

        return true;
    }

    private validateInitData(initData: string): boolean {
        // HMAC-SHA256 validation per Telegram docs
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();

        const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return hash === calculatedHash;
    }
}
```

### 11.3 Reminder Scheduler

```typescript
// modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
    constructor(private reminderRepo: ReminderRepository, private botService: BotService, private logger: Logger) {}

    @Cron('* * * * *') // Every minute
    async processReminders() {
        const pendingReminders = await this.reminderRepo.findPending();

        for (const reminder of pendingReminders) {
            try {
                await this.sendReminder(reminder);
                await this.reminderRepo.markSent(reminder.id);
            } catch (error) {
                this.logger.error(`Failed to send reminder ${reminder.id}`, error);
                await this.reminderRepo.markFailed(reminder.id);
            }
        }
    }

    private async sendReminder(reminder: Reminder) {
        const message = this.formatReminderMessage(reminder);
        await this.botService.sendMessage(reminder.user.telegramId, message, { parse_mode: 'HTML' });
    }
}
```

---

## 12. Unified Project Structure

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

## 13. Development Workflow

### 13.1 Local Setup

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

### 13.2 Nx Commands

| Command               | Description               |
| --------------------- | ------------------------- |
| `nx serve api`        | Start API in dev mode     |
| `nx serve mini-app`   | Start Mini App dev server |
| `nx build api --prod` | Production build          |
| `nx test api`         | Run API tests             |
| `nx lint mini-app`    | Lint Mini App             |
| `nx affected -t test` | Test affected projects    |
| `nx graph`            | Visualize dependencies    |

### 13.3 Git Workflow

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

## 14. Deployment Architecture

### 14.1 Docker Compose (Production)

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
    nginx:
        image: nginx:alpine
        ports:
            - '80:80'
            - '443:443'
        volumes:
            - ./nginx/nginx.conf:/etc/nginx/nginx.conf
            - /etc/letsencrypt:/etc/letsencrypt
        depends_on:
            - api
            - mini-app
            - admin

    api:
        build:
            context: ..
            dockerfile: docker/Dockerfile.api
        environment:
            - DATABASE_URL
            - TELEGRAM_BOT_TOKEN
            - JWT_SECRET
        depends_on:
            - postgres

    bot:
        build:
            context: ..
            dockerfile: docker/Dockerfile.bot
        environment:
            - TELEGRAM_BOT_TOKEN
            - API_URL=http://api:3000

    mini-app:
        build:
            context: ..
            dockerfile: docker/Dockerfile.mini-app
        # Static files served by nginx

    admin:
        build:
            context: ..
            dockerfile: docker/Dockerfile.admin
        # Static files served by nginx

    postgres:
        image: postgres:16-alpine
        volumes:
            - postgres_data:/var/lib/postgresql/data
        environment:
            - POSTGRES_DB=fitcalendar
            - POSTGRES_USER
            - POSTGRES_PASSWORD

volumes:
    postgres_data:
```

### 14.2 Nginx Configuration

```nginx
# docker/nginx/nginx.conf
upstream api {
    server api:3000;
}

server {
    listen 443 ssl http2;
    server_name api.fitcalendar.ru;

    ssl_certificate /etc/letsencrypt/live/fitcalendar.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fitcalendar.ru/privkey.pem;

    location / {
        proxy_pass http://api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name app.fitcalendar.ru;

    root /var/www/mini-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.fitcalendar.ru;

    root /var/www/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 14.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Setup pnpm
              uses: pnpm/action-setup@v2

            - name: Install dependencies
              run: pnpm install --frozen-lockfile

            - name: Run tests
              run: pnpm nx affected -t test --base=HEAD~1

            - name: Build
              run: pnpm nx run-many -t build --prod

            - name: Deploy to VPS
              uses: appleboy/ssh-action@v1
              with:
                  host: ${{ secrets.VPS_HOST }}
                  username: ${{ secrets.VPS_USER }}
                  key: ${{ secrets.VPS_SSH_KEY }}
                  script: |
                      cd /opt/fitcalendar
                      git pull
                      docker compose build
                      docker compose up -d
```

---

## 15. Security and Performance

### 15.1 Security Measures

| Area                 | Implementation                                   |
| -------------------- | ------------------------------------------------ |
| **Authentication**   | Telegram initData HMAC validation, JWT for admin |
| **API Security**     | Rate limiting (100 req/min), CORS whitelist      |
| **Data Protection**  | bcrypt for admin passwords, no PII logging       |
| **HTTPS**            | Let's Encrypt certificates, HSTS headers         |
| **Input Validation** | class-validator DTOs, sanitize all inputs        |
| **SQL Injection**    | TypeORM parameterized queries                    |
| **XSS**              | React auto-escaping, CSP headers                 |

### 15.2 Performance Optimizations

| Area              | Implementation                                       |
| ----------------- | ---------------------------------------------------- |
| **Database**      | Connection pooling (20 connections), indexed queries |
| **Caching**       | In-memory cache for club info, training types        |
| **Images**        | Cloudinary auto-format, lazy loading                 |
| **Bundle Size**   | Vite code splitting, tree shaking                    |
| **API Responses** | Gzip compression, pagination                         |

### 15.3 Performance Targets

| Metric                | Target  |
| --------------------- | ------- |
| API Response (p95)    | < 200ms |
| Mini App TTI          | < 2s    |
| Bundle Size (gzipped) | < 100KB |
| Lighthouse Score      | > 90    |

---

## 16. Testing Strategy

### 16.1 Testing Pyramid

| Level           | Tools                             | Coverage Target |
| --------------- | --------------------------------- | --------------- |
| **Unit**        | Jest (backend), Vitest (frontend) | 80%             |
| **Integration** | Jest + Supertest                  | Key flows       |
| **E2E**         | Playwright                        | Critical paths  |

### 16.2 Backend Testing

```typescript
// Example: schedule.service.spec.ts
describe('ScheduleService', () => {
    let service: ScheduleService;
    let repo: MockRepository<ScheduleEntry>;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            providers: [ScheduleService, { provide: getRepositoryToken(ScheduleEntry), useClass: MockRepository }],
        }).compile();

        service = module.get(ScheduleService);
        repo = module.get(getRepositoryToken(ScheduleEntry));
    });

    it('should return today classes sorted by time', async () => {
        const mockClasses = [
            /* ... */
        ];
        repo.find.mockResolvedValue(mockClasses);

        const result = await service.getToday();

        expect(result).toHaveLength(mockClasses.length);
        expect(repo.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.any(Object),
                order: { startTime: 'ASC' },
            }),
        );
    });
});
```

### 16.3 Frontend Testing

```typescript
// Example: ClassCard.test.tsx
describe('ClassCard', () => {
    it('renders class information correctly', () => {
        const mockClass = {
            id: '1',
            trainingType: { name: 'Yoga', difficulty: 'beginner' },
            coach: { name: 'Maria K.' },
            startTime: new Date('2026-01-09T09:00:00'),
            durationMinutes: 60,
        };

        render(<ClassCard class={mockClass} />);

        expect(screen.getByText('Yoga')).toBeInTheDocument();
        expect(screen.getByText('Maria K.')).toBeInTheDocument();
        expect(screen.getByText('09:00')).toBeInTheDocument();
        expect(screen.getByText('Beginner')).toBeInTheDocument();
    });
});
```

---

## 17. Coding Standards

### 17.1 TypeScript Configuration

```json
// tsconfig.base.json
{
    "compilerOptions": {
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true
    }
}
```

### 17.2 ESLint Rules

```javascript
// .eslintrc.js
module.exports = {
    extends: ['plugin:@nx/typescript', 'plugin:@typescript-eslint/recommended'],
    rules: {
        '@typescript-eslint/explicit-function-return-type': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': 'error',
        'no-console': 'warn',
    },
};
```

### 17.3 Naming Conventions

| Element            | Convention      | Example             |
| ------------------ | --------------- | ------------------- |
| Files (components) | PascalCase      | `ClassCard.tsx`     |
| Files (utilities)  | camelCase       | `dateUtils.ts`      |
| Files (types)      | kebab-case      | `schedule-types.ts` |
| Components         | PascalCase      | `ClassCard`         |
| Functions          | camelCase       | `getSchedule`       |
| Constants          | SCREAMING_SNAKE | `MAX_REMINDERS`     |
| Types/Interfaces   | PascalCase      | `ScheduleEntry`     |
| Enums              | PascalCase      | `Difficulty`        |

---

## 18. Error Handling

### 18.1 API Error Responses

```typescript
// Standard error format
interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

// Example: 404 Not Found
{
  "statusCode": 404,
  "message": "Schedule entry not found",
  "error": "Not Found",
  "timestamp": "2026-01-09T10:00:00.000Z",
  "path": "/api/v1/schedule/123"
}
```

### 18.2 Error Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 400  | Bad Request - Invalid input          |
| 401  | Unauthorized - Auth required         |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource missing         |
| 409  | Conflict - Duplicate reminder        |
| 429  | Too Many Requests - Rate limited     |
| 500  | Internal Error - Server issue        |

### 18.3 Frontend Error Handling

```typescript
// Global error boundary
class ErrorBoundary extends React.Component {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        Sentry.captureException(error);
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }
        return this.props.children;
    }
}
```

---

## 19. Monitoring

### 19.1 Logging (Pino)

```typescript
// logger.config.ts
import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: process.env.NODE_ENV !== 'production' },
    },
    redact: ['req.headers.authorization', 'req.headers["x-telegram-init-data"]'],
});
```

### 19.2 Sentry Integration

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
});
```

### 19.3 Health Checks

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }

    @Get('ready')
    async ready() {
        // Check database connection
        await this.dataSource.query('SELECT 1');
        return { status: 'ready' };
    }
}
```

---

## 20. Checklist Results

### Architecture Checklist

-   [x] All PRD features have corresponding components
-   [x] Tech stack matches PRD requirements (with documented adaptations)
-   [x] Data models support all required functionality
-   [x] API endpoints cover all user flows
-   [x] Security measures documented
-   [x] Performance targets defined
-   [x] Testing strategy complete
-   [x] Deployment pipeline specified
-   [x] Error handling standardized
-   [x] Monitoring configured

### Adaptation Notes

| PRD Requirement | Adaptation  | Rationale                         |
| --------------- | ----------- | --------------------------------- |
| Prisma ORM      | TypeORM     | Existing migration infrastructure |
| Webpack         | Vite        | Modern tooling, faster builds     |
| Project name    | FitCalendar | User preference                   |

---

_Document generated by Winston (Architect Agent)_
_Last updated: 2026-01-09_
