# FitSchedule Telegram App - Product Requirements Document (PRD)

## 1. Goals and Background Context

### 1.1 Goals

-   Provide fitness club members with instant, convenient access to the class schedule via Telegram
-   Enable members to discover classes that match their fitness level and preferences through filtering
-   Keep members informed about schedule changes and upcoming classes through timely notifications
-   Empower club administrators to manage schedule and content without technical knowledge
-   Establish a foundation for future features (booking, payments) while delivering immediate value

### 1.2 Background Context

Fitness club members currently rely on checking a Telegram channel for schedule updates, which is inconvenient and makes it difficult to find specific information quickly. There is no way to filter classes by type, difficulty, or coach, and members often miss schedule changes or cancellations.

This application addresses these pain points by creating a Telegram-native solution combining a Mini App for rich schedule browsing and a Bot for quick commands and notifications. Competitive analysis revealed this is a "blue ocean" opportunity - no direct Telegram competitors exist for gym scheduling, giving first-mover advantage in the Russian-speaking fitness market where Telegram is the dominant messaging platform.

### 1.3 Change Log

| Date       | Version | Description                                                                                                 | Author    |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| 2026-01-08 | 1.0     | Initial PRD creation                                                                                        | PM (John) |
| 2026-05-02 | 1.1     | Defer NFR12 (audit logging) and NFR14 (offline) to Phase 2; epic 6.6 (Training Types Mgmt) confirmed in MVP | PM (John) |
| 2026-05-02 | 1.2     | Add Epic 7 (Memberships & Plans, 6 stories); add FR24-FR30; renumber post-epics sections                    | PM (John) |

---

## 2. Requirements

### 2.1 Functional Requirements

| ID   | Requirement                                                                                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| FR1  | The system shall display the fitness class schedule for today and upcoming days                                                                 |
| FR2  | The system shall show class details including name, time, duration, and assigned coach                                                          |
| FR3  | The system shall provide both daily and weekly calendar views of the schedule                                                                   |
| FR4  | The system shall display training difficulty levels (beginner, intermediate, advanced)                                                          |
| FR5  | The system shall show training impact types (cardio, strength, flexibility, balance)                                                            |
| FR6  | The system shall display equipment requirements for each training class                                                                         |
| FR7  | The system shall allow filtering schedule by training type                                                                                      |
| FR8  | The system shall allow filtering schedule by difficulty level                                                                                   |
| FR9  | The system shall allow filtering schedule by coach                                                                                              |
| FR10 | The system shall support multiple simultaneous filters                                                                                          |
| FR11 | The system shall display coach profiles with photos, specializations, and certifications                                                        |
| FR12 | The system shall show a coach's upcoming class schedule from their profile                                                                      |
| FR13 | The system shall display club information including address, working hours, and contacts                                                        |
| FR14 | The system shall provide a link to open club location in a map application                                                                      |
| FR15 | The system shall allow users to subscribe to reminders for specific classes                                                                     |
| FR16 | The system shall send reminder notifications N minutes before subscribed classes                                                                |
| FR17 | The system shall notify subscribed users when a class time changes                                                                              |
| FR18 | The system shall notify subscribed users when a class is cancelled                                                                              |
| FR19 | The system shall allow users to configure their reminder time preference                                                                        |
| FR20 | The system shall provide an admin panel for managing the schedule                                                                               |
| FR21 | The system shall allow admins to add, edit, and delete training sessions                                                                        |
| FR22 | The system shall allow admins to manage coach profiles                                                                                          |
| FR23 | The system shall allow admins to update club information                                                                                        |
| FR24 | The system shall display the catalog of available membership plans to Mini App users                                                            |
| FR25 | The system shall track each customer's current membership plan, start date, expiration date, and remaining counters (guest visits, freeze days) |
| FR26 | The system shall allow admins to create, edit, deactivate, and (with constraints) delete membership plans                                       |
| FR27 | The system shall allow admins to manage customer records independently of Telegram identity, including bulk-import from CSV                     |
| FR28 | The system shall allow Mini App users to link their Telegram identity to an existing customer record by phone number                            |
| FR29 | The system shall allow admins to assign a customer to a plan, with the system computing the expiration date automatically                       |
| FR30 | The system shall allow admins to log guest visits and freezes against a customer's membership, with audit history and atomic counter updates    |

### 2.2 Non-Functional Requirements

| ID        | Requirement                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR1      | The Mini App shall load initial content within 2 seconds on 3G connection                                                                                     |
| NFR2      | The Bot shall respond to commands within 1 second                                                                                                             |
| NFR3      | The system shall support at least 500 concurrent users                                                                                                        |
| NFR4      | The Mini App shall work on iOS and Android Telegram clients                                                                                                   |
| NFR5      | The interface shall be in Russian language                                                                                                                    |
| NFR6      | The system shall use Telegram's native authentication (no separate login)                                                                                     |
| NFR7      | All API endpoints shall be secured with HTTPS                                                                                                                 |
| NFR8      | Admin panel shall require email/password authentication                                                                                                       |
| NFR9      | The system shall handle Telegram API rate limits gracefully                                                                                                   |
| NFR10     | The system shall continue functioning if notification delivery fails (graceful degradation)                                                                   |
| NFR11     | The database shall be backed up daily                                                                                                                         |
| ~~NFR12~~ | ~~Audit logging~~ — **deferred to Phase 2 (2026-05-02)**                                                                                                      |
| NFR13     | Images shall be optimized for mobile viewing (max 500KB)                                                                                                      |
| ~~NFR14~~ | ~~Offline schedule data~~ — **deferred to Phase 2 (2026-05-02). Telegram WebView requires connectivity; offline support adds complexity for marginal value.** |
| NFR15     | The system shall be deployable via Docker containers                                                                                                          |

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

A fast, intuitive, Telegram-native experience that feels like a natural extension of the messaging app. Users should find class information within 2-3 taps, with the Bot providing instant answers for simple queries and the Mini App offering rich browsing for deeper exploration.

### 3.2 Key Interaction Paradigms

-   **Quick Access**: Bot commands (`/today`, `/week`) for instant schedule info
-   **Rich Browsing**: Mini App for calendar views, filtering, coach profiles
-   **Proactive Notifications**: Reminders and alerts pushed to chat
-   **Minimal Input**: Tap-based navigation, pre-filled filters, smart defaults

### 3.3 Core Screens and Views

**Mini App:**

-   Today's Schedule (default landing)
-   Weekly Calendar View
-   Training Detail View
-   Filter Panel (slide-up sheet)
-   Coach List
-   Coach Profile
-   Club Information
-   My Reminders
-   Settings (reminder preferences)

**Admin Panel:**

-   Login
-   Dashboard (weekly schedule overview)
-   Schedule Management (calendar + list views)
-   Class Create/Edit Form
-   Coach Management
-   Training Types Settings
-   Club Information Settings

### 3.4 Accessibility

WCAG AA compliance where applicable within Telegram Mini App constraints. High contrast text, touch targets minimum 44px, screen reader compatible labels.

### 3.5 Branding

Clean, modern fitness aesthetic. Primary colors aligned with club branding (to be provided). Card-based UI with subtle shadows, rounded corners. Consistent iconography for training types and impact categories.

### 3.6 Target Platforms

-   **Mini App**: Telegram for iOS and Android (WebApp)
-   **Bot**: All Telegram clients
-   **Admin Panel**: Web responsive (desktop-first, mobile-friendly)

---

## 4. Technical Assumptions

### 4.1 Repository Structure

**Monorepo** using Nx workspace (existing repository structure)

Apps:

-   `apps/api` - NestJS backend API
-   `apps/bot` - Telegram Bot (grammY)
-   `apps/mini-app` - React + Vite Mini App
-   `apps/admin` - React + Vite Admin Panel

Libs:

-   `libs/shared` - Shared types, utilities, constants
-   `libs/prisma` - Database client and schema

### 4.2 Service Architecture

Monolith API serving all clients (Bot, Mini App, Admin) with potential for future service extraction. Single PostgreSQL database. Telegram webhooks for bot updates.

### 4.3 Testing Requirements

-   Unit tests for business logic (Jest)
-   Integration tests for API endpoints
-   E2E tests for critical user flows (Playwright for Admin)
-   Manual testing convenience: CLI commands for triggering notifications, seeding test data

### 4.4 Additional Technical Assumptions

-   **Backend Framework**: NestJS with TypeScript
-   **Bot Library**: grammY (modern, TypeScript-first Telegram bot framework)
-   **Database**: PostgreSQL with Prisma ORM
-   **Mini App Framework**: React 18+ with Vite bundler
-   **Admin Panel**: React with Vite, shared component library with Mini App
-   **Styling**: Tailwind CSS for both Mini App and Admin
-   **Image Storage**: Cloudinary for coach photos and club images
-   **CI/CD**: GitHub Actions for testing, building, deployment
-   **Containerization**: Docker with docker-compose for local development
-   **Hosting**: To be determined (Railway, Render, or VPS recommended)
-   **Environment Management**: dotenv with validation (zod)

---

## 5. Epic Overview

| Epic | Title                        | Goal                                                                                                |
| ---- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 1    | Foundation & Bot Setup       | Establish project infrastructure, Telegram bot registration, and Mini App shell with authentication |
| 2    | Schedule Display             | Enable users to view the fitness schedule in daily and weekly formats via Mini App and Bot          |
| 3    | Training Details & Filtering | Provide detailed training information and filtering capabilities by type, difficulty, and coach     |
| 4    | Coach Profiles & Club Info   | Display coach profiles and club information to build trust and help members find trainers           |
| 5    | Reminders & Notifications    | Allow members to subscribe to class reminders and receive schedule change notifications             |
| 6    | Admin Panel                  | Provide administrators with tools to manage schedule, coaches, and club information                 |
| 7    | Memberships & Plans          | Manage the club's plan catalog and track each customer's membership, expiration, and usage          |

---

## 6. Epic 1: Foundation & Bot Setup

**Goal:** Establish the foundational project infrastructure including Telegram bot registration, webhook setup, Mini App shell with Telegram authentication, and database schema. This epic creates the technical foundation all subsequent features will build upon.

### Story 1.1: Project Scaffolding & Configuration

**As a** developer,
**I want** the Nx monorepo configured with all necessary apps and libraries,
**so that** I can begin implementing features with proper project structure.

**Acceptance Criteria:**

1. Nx workspace contains apps: `api`, `bot`, `mini-app`, `admin`
2. Nx workspace contains libs: `shared`, `prisma`
3. TypeScript configured with strict mode across all projects
4. ESLint and Prettier configured with consistent rules
5. Environment variables structure defined with `.env.example`
6. Docker Compose configured for local PostgreSQL database
7. README updated with setup instructions

---

### Story 1.2: Database Schema & Prisma Setup

**As a** developer,
**I want** the core database schema implemented with Prisma,
**so that** I can store and retrieve schedule, coach, and user data.

**Acceptance Criteria:**

1. Prisma schema defines models: User, Coach, TrainingType, ScheduleEntry, Reminder, ClubInfo
2. User model includes Telegram ID, preferences, created/updated timestamps
3. Coach model includes name, bio, photo URL, specializations, certifications, active status
4. TrainingType model includes name, description, difficulty, impact types, equipment
5. ScheduleEntry model includes training type, coach, datetime, duration, status (active/cancelled)
6. Reminder model links User to ScheduleEntry with notification status
7. Prisma migrations run successfully and seed script creates test data
8. Database connection tested via simple health check endpoint

---

### Story 1.3: NestJS API Foundation

**As a** developer,
**I want** the NestJS API configured with essential middleware and health endpoint,
**so that** I have a working backend to build features upon.

**Acceptance Criteria:**

1. NestJS app starts successfully on configured port
2. GET `/health` returns 200 with status and timestamp
3. CORS configured for Mini App and Admin origins
4. Request logging middleware implemented
5. Global exception filter returns consistent error format
6. Swagger/OpenAPI documentation auto-generated at `/api/docs`
7. Environment validation ensures required variables are set

---

### Story 1.4: Telegram Bot Registration & Webhook

**As a** developer,
**I want** the Telegram bot registered and receiving updates via webhook,
**so that** users can interact with the bot.

**Acceptance Criteria:**

1. Bot registered with BotFather, token stored securely in environment
2. grammY bot instance configured with webhook mode
3. Webhook endpoint `/bot/webhook` receives Telegram updates
4. Webhook URL registered with Telegram API on app startup
5. Bot responds to `/start` command with welcome message
6. Bot includes button to launch Mini App
7. Webhook signature validation implemented for security
8. Error handling logs failed updates without crashing

---

### Story 1.5: Mini App Shell & Telegram Auth

**As a** gym member,
**I want** to open the Mini App from the Telegram bot,
**so that** I can access the fitness schedule interface.

**Acceptance Criteria:**

1. React + Vite Mini App builds and runs successfully
2. Mini App configured with Telegram WebApp SDK
3. Telegram initData validated on backend for authentication
4. User automatically created/updated in database on first Mini App open
5. Mini App displays loading state while authenticating
6. Error state shown if authentication fails
7. Basic navigation shell with placeholder pages
8. Mini App accessible via bot menu button

---

### Story 1.6: CI/CD Pipeline Setup

**As a** developer,
**I want** automated testing and deployment pipelines,
**so that** code quality is maintained and deployments are consistent.

**Acceptance Criteria:**

1. GitHub Actions workflow runs on push to main and pull requests
2. Workflow executes lint, type-check, and unit tests for all affected projects
3. Workflow builds Docker images for API and Bot
4. Build artifacts cached for faster subsequent runs
5. Branch protection requires passing CI checks
6. Deployment workflow (manual trigger) deploys to staging environment
7. Environment secrets configured in GitHub repository settings

---

## 7. Epic 2: Schedule Display

**Goal:** Enable gym members to view the fitness class schedule through both the Telegram Mini App (rich calendar interface) and Bot commands (quick text responses), providing convenient access to daily and weekly schedules.

### Story 2.1: Schedule API Endpoints

**As a** frontend developer,
**I want** API endpoints to retrieve the fitness schedule,
**so that** I can display schedule data in the Mini App and Bot.

**Acceptance Criteria:**

1. GET `/api/schedule/today` returns today's classes sorted by time
2. GET `/api/schedule/week` returns classes for the current week grouped by day
3. GET `/api/schedule/:date` returns classes for a specific date (YYYY-MM-DD format)
4. Response includes: class ID, name, start time, duration, coach name, coach photo URL
5. Cancelled classes are excluded from default response (optional `includeCancelled` param)
6. Empty days return empty arrays (not omitted from response)
7. API responses are cached for 5 minutes (cache invalidated on admin updates)

---

### Story 2.2: Today's Schedule View (Mini App)

**As a** gym member,
**I want** to see today's fitness classes when I open the Mini App,
**so that** I can quickly check what's available today.

**Acceptance Criteria:**

1. Today's schedule is the default landing view
2. Classes displayed as cards in chronological order
3. Each card shows: class name, time, duration, coach name with thumbnail
4. Visual indicator for classes currently in progress
5. Past classes are visually muted but still visible
6. Empty state displayed when no classes scheduled
7. Pull-to-refresh updates the schedule
8. Loading skeleton shown while fetching data

---

### Story 2.3: Weekly Calendar View

**As a** gym member,
**I want** to view the schedule for the entire week,
**so that** I can plan my workouts in advance.

**Acceptance Criteria:**

1. Weekly view accessible via tab/toggle from daily view
2. Calendar displays 7 days starting from today
3. Each day shows condensed class list (time + name)
4. Tapping a day expands to show full day's schedule
5. Current day is visually highlighted
6. Navigation arrows allow viewing next/previous weeks
7. Days with no classes show "No classes" indicator
8. Week view scrolls horizontally on mobile

---

### Story 2.4: Bot /today Command

**As a** gym member,
**I want** to type `/today` to get today's schedule,
**so that** I can quickly check classes without opening the Mini App.

**Acceptance Criteria:**

1. Bot responds to `/today` command
2. Response lists all classes for today with time, name, coach
3. Classes formatted as readable text list (not overwhelming)
4. If no classes, responds with friendly "No classes today" message
5. Response includes button to open Mini App for full details
6. Command works in both private chat and group (if bot added)
7. Response generated within 1 second

---

### Story 2.5: Class Card Component

**As a** gym member,
**I want** class cards to show essential information at a glance,
**so that** I can quickly scan the schedule.

**Acceptance Criteria:**

1. Reusable ClassCard component created for Mini App
2. Card displays: class name (prominent), time range, duration badge
3. Card shows coach thumbnail and name
4. Difficulty level shown as colored badge (green/yellow/red)
5. Card is tappable, navigating to detail view
6. Card has subtle shadow and rounded corners per design system
7. Component handles missing data gracefully (fallback for no photo, etc.)

---

## 8. Epic 3: Training Details & Filtering

**Goal:** Enable users to view comprehensive training information and filter the schedule based on their preferences (type, difficulty, coach), helping them find classes that match their fitness level and goals.

### Story 3.1: Training Detail View

**As a** gym member,
**I want** to view detailed information about a specific training class,
**so that** I can make an informed decision about whether it suits my fitness level and goals.

**Acceptance Criteria:**

1. Tapping a class card in the schedule opens a detail view
2. Detail view displays: class name, coach name with photo, date/time, duration
3. Detail view shows difficulty level with visual indicator (badge/icon)
4. Detail view shows impact types (cardio, strength, flexibility, balance) as tags
5. Equipment requirements are listed if applicable
6. Class description is displayed (if available)
7. Back navigation returns to previous schedule view maintaining scroll position
8. View renders correctly on mobile screens within Telegram Mini App

---

### Story 3.2: Training Metadata API

**As a** frontend developer,
**I want** API endpoints that provide training metadata (difficulty levels, impact types, equipment),
**so that** I can populate filter options and display training details.

**Acceptance Criteria:**

1. GET `/api/training-types` returns list of all training types with names and icons
2. GET `/api/difficulty-levels` returns difficulty options (beginner, intermediate, advanced)
3. GET `/api/impact-types` returns impact categories (cardio, strength, flexibility, balance)
4. GET `/api/equipment` returns list of equipment items used in trainings
5. Responses include Russian localized names
6. Endpoints are cached appropriately (metadata changes infrequently)
7. All endpoints return consistent JSON structure

---

### Story 3.3: Schedule Filtering API

**As a** frontend developer,
**I want** the schedule API to support filtering parameters,
**so that** users can retrieve only classes matching their criteria.

**Acceptance Criteria:**

1. GET `/api/schedule` accepts `difficultyLevel` query parameter
2. GET `/api/schedule` accepts `impactType` query parameter (supports multiple values)
3. GET `/api/schedule` accepts `coachId` query parameter
4. GET `/api/schedule` accepts `trainingType` query parameter
5. Multiple filters can be combined (AND logic)
6. Invalid filter values return 400 with descriptive error
7. Empty results return empty array (not error)
8. Filter parameters are optional; omitting returns all classes

---

### Story 3.4: Filter UI Component

**As a** gym member,
**I want** to filter the schedule by training type, difficulty, and coach,
**so that** I can quickly find classes that match my preferences.

**Acceptance Criteria:**

1. Filter panel is accessible via filter icon/button on schedule views
2. Filter options include: Training Type, Difficulty Level, Coach
3. Multiple filters can be applied simultaneously
4. Active filters are visually indicated (badge count or highlighted state)
5. "Clear All" button resets all filters
6. Applying filters immediately updates the schedule view
7. Filter selections persist within the session
8. Filter panel works as slide-up sheet on mobile

---

### Story 3.5: Impact Type Indicators

**As a** gym member,
**I want** to see visual indicators of what body systems each class targets,
**so that** I can balance my weekly workout routine.

**Acceptance Criteria:**

1. Impact types (cardio, strength, flexibility, balance) display as colored icons/badges
2. Icons are consistent across class cards and detail views
3. Each impact type has distinct color for quick recognition
4. Hovering/tapping an icon shows the impact type name (tooltip)
5. Classes can have multiple impact types displayed
6. Icons render at appropriate size for mobile touch targets

---

## 9. Epic 4: Coach Profiles & Club Info

**Goal:** Provide users with detailed information about coaches and the fitness club, building trust and enabling members to find and follow their preferred trainers.

### Story 4.1: Coach List API & View

**As a** gym member,
**I want** to see a list of all coaches at the club,
**so that** I can explore who teaches classes and learn about their expertise.

**Acceptance Criteria:**

1. GET `/api/coaches` returns list of all active coaches
2. Response includes: id, name, photo URL, primary specialization
3. Coaches are sorted alphabetically by default
4. Mini App displays coach list as a grid or list with photos
5. Coach list is accessible from main navigation/menu
6. Tapping a coach card navigates to their profile
7. Photos display with fallback placeholder if not available

---

### Story 4.2: Coach Profile Detail View

**As a** gym member,
**I want** to view a coach's detailed profile,
**so that** I can learn about their background, certifications, and specializations.

**Acceptance Criteria:**

1. GET `/api/coaches/:id` returns full coach profile
2. Profile displays: full name, photo, bio/description
3. Profile shows list of specializations (e.g., yoga, strength training)
4. Certifications are displayed if available
5. "View Schedule" button shows classes taught by this coach
6. Back navigation returns to coach list
7. Profile renders well on mobile with proper image sizing

---

### Story 4.3: Coach Schedule View

**As a** gym member,
**I want** to see all upcoming classes taught by a specific coach,
**so that** I can plan to attend sessions with my preferred trainer.

**Acceptance Criteria:**

1. Coach profile includes "View Schedule" action
2. Clicking shows filtered schedule with only that coach's classes
3. Schedule displays in chronological order (upcoming first)
4. Each class card shows date, time, class name, difficulty
5. Tapping a class navigates to training detail view
6. Empty state shown if coach has no upcoming classes
7. User can navigate back to coach profile

---

### Story 4.4: Club Information Page

**As a** gym member,
**I want** to view club information (address, hours, contacts),
**so that** I can easily find how to reach or contact the club.

**Acceptance Criteria:**

1. GET `/api/club-info` returns club details
2. Club page displays: name, address, phone number, working hours
3. Phone number is clickable (initiates call on mobile)
4. Working hours show daily schedule (Mon-Sun)
5. Club page is accessible from main navigation/menu
6. Page includes club logo/image if available

---

### Story 4.5: Map Location Link

**As a** gym member,
**I want** to open the club location in a map application,
**so that** I can get directions to the fitness club.

**Acceptance Criteria:**

1. Club info page includes "Show on Map" button
2. Button opens location in Telegram's native map or external map app
3. Coordinates are stored in club settings (latitude, longitude)
4. Works on both iOS and Android devices
5. Fallback to Google Maps URL if native map unavailable
6. Address text is also displayed for manual lookup

---

## 10. Epic 5: Reminders & Notifications

**Goal:** Keep members informed about their chosen classes and schedule changes through timely Telegram notifications, ensuring they never miss a workout or get surprised by cancellations.

### Story 5.1: Class Reminder Subscription

**As a** gym member,
**I want** to subscribe to reminders for specific classes,
**so that** I get notified before classes I plan to attend.

**Acceptance Criteria:**

1. Training detail view includes "Remind Me" button
2. POST `/api/reminders` creates reminder subscription for user + class
3. Button toggles to "Cancel Reminder" when subscription active
4. User can subscribe to multiple classes
5. Subscription is linked to Telegram user ID
6. DELETE `/api/reminders/:id` removes subscription
7. Duplicate subscription attempts return existing subscription (idempotent)

---

### Story 5.2: Reminder Time Preferences

**As a** gym member,
**I want** to configure how long before a class I receive reminders,
**so that** notifications arrive at a time that works for my schedule.

**Acceptance Criteria:**

1. Settings page includes reminder time preference
2. Options: 15 minutes, 30 minutes, 1 hour, 2 hours before class
3. Default value is 30 minutes
4. PUT `/api/users/settings` updates preference
5. GET `/api/users/settings` returns current preference
6. Setting applies to all future reminders for the user
7. Setting persists across sessions

---

### Story 5.3: Reminder Notification Delivery

**As a** gym member,
**I want** to receive a Telegram message before my subscribed classes,
**so that** I have time to prepare and get to the gym.

**Acceptance Criteria:**

1. Scheduled job checks for upcoming reminders to send
2. Notification sent via Telegram Bot at user's preferred time before class
3. Message includes: class name, time, coach name
4. Message includes deep link to class details in Mini App
5. Reminders are sent only once per subscription
6. Reminder marked as "sent" after successful delivery
7. Failed deliveries are logged and retried (max 3 attempts)

---

### Story 5.4: Schedule Change Notifications

**As a** gym member,
**I want** to be notified when a class I'm subscribed to changes time or details,
**so that** I can adjust my plans accordingly.

**Acceptance Criteria:**

1. When admin updates class time, affected subscribers are notified
2. Notification includes: class name, old time, new time
3. Only users with active reminders for that class receive notification
4. Notification sent immediately upon change (not scheduled)
5. Message clearly indicates it's a schedule change (not regular reminder)
6. Deep link to updated class details included

---

### Story 5.5: Class Cancellation Notifications

**As a** gym member,
**I want** to be notified immediately when a class I'm subscribed to is cancelled,
**so that** I don't waste time going to the gym for nothing.

**Acceptance Criteria:**

1. When admin cancels a class, all subscribers are notified
2. Notification includes: class name, original date/time, cancellation reason (if provided)
3. Notification sent immediately upon cancellation
4. Associated reminders are automatically removed
5. Message clearly marked as cancellation alert
6. Notification suggests alternative classes (same day, if available)

---

### Story 5.6: My Reminders List

**As a** gym member,
**I want** to see a list of all classes I've subscribed to reminders for,
**so that** I can manage my upcoming workout plans.

**Acceptance Criteria:**

1. GET `/api/reminders` returns user's active reminder subscriptions
2. Mini App includes "My Reminders" section accessible from menu
3. List shows class name, date/time, coach for each subscription
4. Each item has "Cancel Reminder" action
5. Past classes are automatically removed from list
6. Empty state shown when no active reminders
7. List sorted by class date (soonest first)

---

## 11. Epic 6: Admin Panel

**Goal:** Provide club administrators with a simple, intuitive web interface to manage the schedule, coaches, and club information without requiring technical knowledge.

### Story 6.1: Admin Authentication

**As a** club administrator,
**I want** to securely log in to the admin panel,
**so that** only authorized staff can manage club content.

**Acceptance Criteria:**

1. Admin panel has dedicated login page at `/admin`
2. Login requires email and password
3. Passwords are hashed using bcrypt (min 10 rounds)
4. Failed login attempts show generic error (no user enumeration)
5. Session created on successful login (JWT or session cookie)
6. Session expires after 24 hours of inactivity
7. Logout button clears session and redirects to login
8. Protected routes redirect to login if not authenticated

---

### Story 6.2: Schedule Management - View & List

**As a** club administrator,
**I want** to view all scheduled classes in a list or calendar format,
**so that** I can see the current schedule at a glance.

**Acceptance Criteria:**

1. Dashboard shows upcoming classes for current week
2. Calendar view displays classes in weekly grid format
3. List view shows classes in chronological order
4. Each entry shows: class name, date/time, coach, status
5. Toggle between calendar and list views
6. Navigate to previous/next weeks
7. Filter by coach or training type
8. Cancelled classes visually distinguished (strikethrough or badge)

---

### Story 6.3: Schedule Management - Create & Edit Classes

**As a** club administrator,
**I want** to add new classes and edit existing ones,
**so that** I can keep the schedule up to date.

**Acceptance Criteria:**

1. "Add Class" button opens creation form
2. Form fields: training type, coach, date, start time, duration
3. Training type selected from predefined list
4. Coach selected from dropdown of active coaches
5. Date picker for selecting class date
6. Time picker for start time
7. Duration in minutes (dropdown: 30, 45, 60, 90)
8. Edit existing class by clicking on it in schedule view
9. Save validates required fields before submission
10. Success message shown after save; schedule refreshes

---

### Story 6.4: Schedule Management - Cancel & Delete Classes

**As a** club administrator,
**I want** to cancel or delete classes,
**so that** I can handle schedule changes and remove mistakes.

**Acceptance Criteria:**

1. Each class has "Cancel" and "Delete" actions
2. Cancel marks class as cancelled (keeps record, notifies subscribers)
3. Cancel prompts for optional cancellation reason
4. Delete permanently removes class (with confirmation dialog)
5. Delete only allowed for classes with no reminder subscriptions, OR warns admin that subscribers will be notified
6. Cancelled classes can be "uncancelled" (restored)
7. Bulk cancel option for multiple classes (e.g., coach sick day)

---

### Story 6.5: Coach Management

**As a** club administrator,
**I want** to add, edit, and remove coach profiles,
**so that** member-facing coach information stays current.

**Acceptance Criteria:**

1. Admin panel has "Coaches" section in navigation
2. List view shows all coaches with photo, name, status
3. "Add Coach" opens form with: name, photo upload, bio, specializations, certifications
4. Photo upload to Cloudinary with size validation (max 2MB)
5. Edit existing coach by clicking on their entry
6. "Deactivate" hides coach from member-facing views (soft delete)
7. Cannot delete coach with future scheduled classes (must reassign first)
8. Reactivate option for deactivated coaches

---

### Story 6.6: Training Types & Metadata Management

**As a** club administrator,
**I want** to manage training types, difficulty levels, and impact categories,
**so that** I can customize the class classification system.

**Acceptance Criteria:**

1. Admin panel has "Settings > Training Types" section
2. List all training types with name and icon
3. Add new training type with name, description, default difficulty, impact types
4. Edit existing training types
5. Deactivate training types (hide from new class creation)
6. Cannot delete training types in use by existing classes
7. Impact types (cardio, strength, flexibility, balance) are system-defined (read-only)

---

### Story 6.7: Club Information Management

**As a** club administrator,
**I want** to update club information (address, hours, contacts),
**so that** members always have accurate contact details.

**Acceptance Criteria:**

1. Admin panel has "Club Info" section
2. Editable fields: club name, address, phone, working hours
3. Working hours editor for each day of week (open/close times, or "closed")
4. Map coordinates input (latitude, longitude) with preview
5. Club logo upload to Cloudinary
6. Save updates club information immediately
7. Changes reflected in member-facing views without delay
8. Validation ensures phone format is correct

---

## 12. Epic 7: Memberships & Plans

**Goal:** Establish a customer-membership system where the club's reception is the source of truth for who is a member and what plan they have. Customers are managed entirely by admins (via panel or CSV import), independent of who has opened the Mini App. Telegram identity is linked to a customer record by phone match. Members see their current plan, expiration, and remaining benefits in the Mini App; admins manage the catalog and log guest visits / freezes against memberships.

**Architectural note:** This epic refactors the auth model from Story 1.5 (auto-upsert User on Telegram open) to a customer-lookup model. The `User` entity is renamed to `Customer`, populated only by admin actions or CSV import. Anonymous browsing (schedule, coaches, club, plans) stays open to any Telegram user; profile and reminders gated behind a linked customer record.

### Story 7.1: Membership Plan Catalog

**As a** club administrator,
**I want** to define the club's membership plans (12-month, 6-month, drop-in, etc.) with their durations, prices, and included features,
**so that** customers can be assigned to plans and members can browse the catalog.

**Acceptance Criteria:**

1. New `MembershipPlan` entity with: name, durationValue, durationUnit (day/week/month), priceRub, features (free-form list), guestVisitsAllowed, freezeDaysAllowed, isActive
2. Public `GET /membership-plans` endpoint returns active plans for the Mini App catalog
3. Admin CRUD endpoints under `/admin/membership-plans` with deactivate-vs-delete semantics
4. Plans cannot be hard-deleted while customer memberships reference them (use deactivation)
5. Mini App `/plans` page renders cards with name, duration label, price, features, badges for guest visits / freeze days
6. Admin UI provides list, create, edit, deactivate
7. Russian pluralization helper handles duration labels ("12 месяцев", "1 неделя", etc.)

---

### Story 7.2: Customer CRUD + Telegram Phone Linking

**As a** club administrator,
**I want** to manage the club's customer records directly in the admin panel,
**so that** the system has a complete and authoritative member list regardless of who has used the Mini App.

**As a** Mini App user,
**I want** to link my Telegram account to my customer record by entering my phone number once,
**so that** I see my personal membership without anyone re-registering me.

**Acceptance Criteria:**

1. `Customer` entity replaces `User` with: firstName, lastName, phone (unique, normalized), email, telegramId (nullable), telegramUsername, isActive, notes
2. `TelegramAuthGuard` no longer auto-creates records; looks up customer by telegramId and attaches null when not linked
3. Customer-required endpoints (reminders, profile, settings) reject unlinked requests with 403 + code `CUSTOMER_NOT_LINKED`
4. `POST /me/link-phone` looks up customer by normalized phone and links the calling Telegram identity
5. Phone normalizer accepts common Russian formats and returns canonical `+7XXXXXXXXXX`
6. Linking errors distinguish: phone not found (404), phone linked to other (409), invalid format (400)
7. Admin CRUD endpoints with search, filters, pagination
8. Admin can unlink a customer's Telegram identity for re-linking from a different account
9. Reminder entity's `userId` column renames to `customerId`; existing migration test fixtures updated

---

### Story 7.3: Customer CSV Bulk Import

**As a** club administrator,
**I want** to bulk-import the club's existing customer list from a CSV file,
**so that** I don't have to type 200 members one-by-one when launching the system.

**Acceptance Criteria:**

1. `POST /admin/customers/import` accepts a CSV upload; dry-run is the default (no DB writes)
2. Required columns: firstName, phone. Optional: lastName, email, telegramUsername, notes
3. Phone normalized via the same helper as Story 7.2
4. Upsert key is normalized phone — existing customers are updated, new ones created
5. Within a CSV, duplicate phones are reported as errors and skipped (first occurrence kept)
6. Per-row error report with row number, column, message — all in Russian
7. Admin reviews preview, then submits with `?commit=true` to apply
8. Maximum: 5MB file, 5000 rows; larger rejected with clear error
9. Commit happens atomically in a transaction

---

### Story 7.4: Membership Assignment + Mini App Profile

**As a** club administrator,
**I want** to assign a customer to a plan with a start date and have the system compute their expiration automatically,
**so that** I don't do calendar math at the front desk and the customer's state is reliable.

**As a** club member,
**I want** to see my current plan, included features, remaining guest visits, and expiration date,
**so that** I can plan my visits and renewals without asking reception.

**Acceptance Criteria:**

1. New `CustomerMembership` entity joins Customer ↔ MembershipPlan with snapshot fields (endDate, guestVisitsRemaining, freezeDaysRemaining, status)
2. `endDate` and counters are computed/snapshotted at assignment time; plan edits do not propagate to existing memberships
3. A customer may have at most one `active` membership; assigning over an existing active returns 409 + `ACTIVE_MEMBERSHIP_EXISTS` for explicit cancel-then-create flow
4. `GET /me/membership` returns the caller's active membership with embedded plan + computed `daysRemaining`
5. Mini App profile page (`/me`) accessible via a profile icon in the AppShell header
6. Profile renders membership card: plan name, "Действует до", countdown badge with urgency colors, features, remaining counters
7. Daily cron job flips memberships from `active` to `expired` based on `endDate`
8. Admin UI on customer edit page shows current membership + history; assign / cancel / edit-endDate actions

---

### Story 7.5: Guest Visit Logging

**As a** club administrator,
**I want** to record when a member brings a guest, decrementing their remaining count,
**so that** members can't exceed their plan's allowance and we have an audit trail.

**Acceptance Criteria:**

1. New `GuestVisit` entity: customerMembershipId, visitedAt, notes, recordedByAdminId
2. `POST /admin/memberships/:id/guest-visits` decrements `guestVisitsRemaining` atomically (transaction + row lock)
3. Reject with 400 + code `NO_GUEST_VISITS_REMAINING` when counter is 0
4. Reject with 400 + code `MEMBERSHIP_NOT_ACTIVE` when membership isn't active
5. `DELETE /admin/guest-visits/:id` reverses a visit (increments counter back) for fat-finger correction
6. Admin UI on the active membership card shows "+1 visit" button (disabled at 0) + history list
7. Mini App `MembershipCard` reflects the decremented counter on next fetch

---

### Story 7.6: Membership Freeze Workflow

**As a** club administrator,
**I want** to freeze a member's membership for a defined period, shifting their expiration forward,
**so that** members feel fairly treated and the system tracks freeze entitlements accurately.

**Acceptance Criteria:**

1. New `FreezeEvent` entity: customerMembershipId, startDate, endDate, durationDays, notes, recordedByAdminId
2. `POST /admin/memberships/:id/freezes` records a freeze: shifts membership endDate forward by `durationDays`, decrements `freezeDaysRemaining`, atomically
3. Single contiguous freeze for MVP: a membership can have at most one freeze; second attempt → 400 + code `FREEZE_ALREADY_USED`
4. Reject with 400 + code `INSUFFICIENT_FREEZE_DAYS` when `durationDays > freezeDaysRemaining`
5. Reject with 400 + code `MEMBERSHIP_NOT_ACTIVE` when status isn't active
6. `DELETE /admin/freezes/:id` reverses a freeze (shifts endDate back, increments counter back)
7. Admin UI on the active membership card shows "Freeze" button + freeze details after recorded
8. Mini App `MembershipCard` shows yellow "Заморожен до DD MMM" banner when today is within an active freeze period

---

## 13. Checklist Results Report

### Executive Summary

| Metric                         | Assessment                                 |
| ------------------------------ | ------------------------------------------ |
| **Overall PRD Completeness**   | 94%                                        |
| **MVP Scope Appropriateness**  | Just Right                                 |
| **Readiness for Architecture** | READY                                      |
| **Most Critical Concern**      | Minor - Consider adding user flow diagrams |

### Category Analysis

| Category                         | Status      | Critical Issues                                    |
| -------------------------------- | ----------- | -------------------------------------------------- |
| 1. Problem Definition & Context  | **PASS**    | None                                               |
| 2. MVP Scope Definition          | **PASS**    | None                                               |
| 3. User Experience Requirements  | **PASS**    | Minor - diagrams would enhance                     |
| 4. Functional Requirements       | **PASS**    | None - 30 FRs cover MVP                            |
| 5. Non-Functional Requirements   | **PASS**    | None - 13 NFRs (NFR12 + NFR14 deferred to Phase 2) |
| 6. Epic & Story Structure        | **PASS**    | None - 7 epics, 40 stories                         |
| 7. Technical Guidance            | **PASS**    | None - stack defined                               |
| 8. Cross-Functional Requirements | **PASS**    | None                                               |
| 9. Clarity & Communication       | **PARTIAL** | Visual diagrams recommended                        |

### Final Decision

**READY FOR ARCHITECT** - The PRD and epics are comprehensive, properly structured, and ready for architectural design.

---

## 14. Next Steps

### 13.1 UX Expert Prompt

```
Review the PRD at docs/prd.md for the FitSchedule Telegram fitness schedule application.

Focus on:
1. The Telegram Mini App interface design for schedule viewing, filtering, and training details
2. Mobile-first interaction patterns within Telegram's WebApp constraints
3. The Admin Panel web interface for non-technical staff
4. Creating a cohesive visual language that works within Telegram's UI paradigm

Key screens to design: Today's Schedule, Weekly Calendar, Training Detail, Filter Panel,
Coach Profile, My Reminders, Admin Dashboard, Class Management Form.

Deliver wireframes or mockups that address the UI Design Goals section of the PRD.
```

### 13.2 Architect Prompt

```
Review the PRD at docs/prd.md for the FitSchedule Telegram fitness schedule application.

Design the technical architecture for a Hybrid Telegram solution (Bot + Mini App + Admin Panel)
using the existing Nx monorepo with NestJS backend.

Key technical decisions needed:
1. Monorepo structure for bot, mini-app, admin, and API apps
2. Database schema for schedules, coaches, users, reminders
3. Telegram webhook handling and Mini App authentication flow
4. Notification scheduling system (job queue approach)
5. API design for schedule, filtering, and admin operations

Constraints: React + Vite for Mini App, grammY for bot, PostgreSQL with Prisma,
Cloudinary for images.

Deliver architecture.md with tech stack, data models, API structure, and implementation
approach for each epic.
```
