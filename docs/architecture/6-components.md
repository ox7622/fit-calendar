# 6. Components

## 6.1 Backend Modules (NestJS)

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

## 6.2 Frontend Components (Mini App)

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

## 6.3 Frontend Components (Admin Panel)

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

## 6.4 Shared Library (libs/ui)

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
