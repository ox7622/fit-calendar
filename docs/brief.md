# Project Brief: FitSchedule Telegram

**Created:** January 2026
**Facilitator:** Mary (Business Analyst)
**Status:** Draft - Pending Stakeholder Approval

---

## Executive Summary

**Product Concept:**
A Telegram-native fitness scheduling solution combining a Mini App (for rich browsing) and Bot (for notifications/quick queries) that enables fitness club customers to view group training schedules, explore coach profiles, and receive real-time updates — all without installing a separate mobile application.

**Primary Problem:**
Fitness club customers currently rely on a Telegram channel for schedule updates, which is broadcast-only and inconvenient. Members must scroll through posts to find relevant information, cannot filter by date/coach/difficulty, and have no way to receive personal reminders or instant notifications about changes.

**Target Market:**
Single fitness club serving active members who already use Telegram as their primary messaging platform. Primary users are busy professionals who value speed and convenience.

**Key Value Proposition:**
Instant access to accurate, real-time fitness schedules with rich training details (difficulty, impact, equipment) and coach information — accessible in under 2 seconds, directly within Telegram, with proactive notifications for schedule changes.

---

## Problem Statement

**Current State & Pain Points:**

The fitness club currently uses a Telegram channel to broadcast schedule updates and cancellations. While this reaches members where they already are, it has significant limitations:

| Current Approach | Pain Point |
|------------------|------------|
| Telegram channel posts | Broadcast-only; members must scroll to find relevant info |
| No filtering | Can't filter by date, coach, difficulty, or training type |
| No interactivity | Can't ask questions, set reminders, or reserve spots |
| Information overload | Cancellations mixed with general posts; easy to miss |
| No schedule view | No calendar/grid view — just chronological posts |
| No training details | Limited space for difficulty, impact, equipment info |

**Impact of the Problem:**

- **Member friction:** Finding "what's available today" requires scrolling through posts
- **Missed updates:** Important cancellations get buried in channel history
- **No personalization:** Can't follow specific coaches or training types
- **Decision difficulty:** Not enough info to decide if a class suits their level
- **No reminders:** Members must remember class times themselves

**Why the Current Channel Falls Short:**

| Need | Channel Limitation |
|------|-------------------|
| "Show me today's classes" | Must scroll; no quick view |
| "Filter by difficulty" | Not possible |
| "Remind me before class" | Channels can't send personal reminders |
| "Is Maria teaching today?" | Must search manually |
| "What equipment do I need?" | Limited detail in posts |

**Urgency:**

- Members already on Telegram — low adoption friction for better solution
- Expectation of modern, interactive digital experiences
- Competitors with apps/bots provide better UX
- Current channel creates friction that a Bot + Mini App solves elegantly

---

## Proposed Solution

**Core Concept:**

A **Hybrid Telegram Solution** consisting of:

| Component | Purpose |
|-----------|---------|
| **Telegram Mini App** | Rich, visual interface for browsing schedules, coach profiles, and training details |
| **Telegram Bot** | Quick commands, personal reminders, and push notifications for schedule changes |
| **Existing Channel** | Continues for general announcements; links to Bot/Mini App for details |

**How It Works:**

```
┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Channel    │    │     Bot      │    │   Mini App   │  │
│  │              │    │              │    │              │  │
│  │ • News       │───▶│ • /today     │───▶│ • Calendar   │  │
│  │ • Promos     │    │ • /remind    │    │ • Filters    │  │
│  │ • Links      │    │ • Notifies   │    │ • Coaches    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   Backend API    │
                    │   + Admin Panel  │
                    └──────────────────┘
```

**Key Differentiators:**

| vs. Current Channel | Our Solution |
|---------------------|--------------|
| Scroll to find info | Instant "today" view |
| No filtering | Filter by date, coach, type, difficulty |
| No reminders | Bot sends personal reminder 1hr before |
| Cancellations buried | Push notification on changes |
| Limited training info | Full details: difficulty, impact, equipment |
| No coach info | Rich coach profiles with photos, bio, certifications |

**Why This Will Succeed:**

1. **Zero friction adoption** — Members already use Telegram; no new app to install
2. **Leverages existing channel** — Doesn't replace, enhances current workflow
3. **Best of both worlds** — Rich UI (Mini App) + Notifications (Bot)
4. **Solves real pain** — "What's today?" answered in 2 seconds
5. **Scales simply** — Same architecture supports future features (booking, payments)

**High-Level Vision:**

> *"Open Telegram → Tap bot → See today's classes instantly. Tap a class → See full details. Tap 'Remind me' → Get notified 1 hour before. Done."*

---

## Target Users

### Primary User Segment: Fitness Club Members

**Profile:**

| Attribute | Description |
|-----------|-------------|
| **Demographics** | Adults 25-45, busy professionals, health-conscious |
| **Tech comfort** | Moderate to high; daily Telegram users |
| **Location** | Local to the fitness club; single city/region |
| **Membership** | Active gym members with group class access |

**Current Behaviors:**
- Check Telegram channel for schedule updates (inconvenient)
- Message friends to ask "are you going to yoga today?"
- Forget class times; sometimes miss trainings
- Scroll through channel history looking for cancellation posts

**Specific Needs & Pain Points:**

| Need | Pain Point |
|------|------------|
| Know today's schedule quickly | Must scroll through channel posts |
| Find classes that fit their level | No difficulty filtering available |
| Remember class times | No reminder system |
| Know if favorite coach is teaching | Manual search required |
| Understand what to bring | Equipment info not always posted |

**Goals:**
- Attend 2-4 group classes per week consistently
- Find classes that match their fitness level and interests
- Minimize time spent figuring out the schedule
- Never miss a class due to forgotten times or unnoticed cancellations

---

### Secondary User Segment: Fitness Club Administrators/Managers

**Profile:**

| Attribute | Description |
|-----------|-------------|
| **Role** | Gym manager, front desk staff, operations coordinator |
| **Tech comfort** | Basic to moderate; not developers |
| **Responsibility** | Schedule management, coach coordination, member communication |

**Current Behaviors:**
- Post updates to Telegram channel manually
- Handle last-minute changes (coach sick, room change)
- Answer member questions about schedule
- Coordinate with coaches on class details

**Specific Needs & Pain Points:**

| Need | Pain Point |
|------|------------|
| Update schedule quickly | Current process may be slow or manual |
| Notify members of changes | Channel posts may be missed |
| Manage coach profiles | No centralized system |
| Track class popularity | No analytics on what members view |

**Goals:**
- Reduce time spent on schedule communication
- Ensure members always have accurate information
- Handle last-minute changes smoothly
- Understand which classes are most popular

---

### Tertiary User Segment: Fitness Coaches/Trainers

**Profile:**

| Attribute | Description |
|-----------|-------------|
| **Role** | Group class instructors, personal trainers |
| **Tech comfort** | Variable; may not be tech-focused |
| **Responsibility** | Teach classes, maintain professional profile |

**Current Behaviors:**
- Notify admin when unable to teach
- May have limited visibility into their own schedule display

**Specific Needs & Pain Points:**

| Need | Pain Point |
|------|------------|
| Accurate class listings | Ensure their classes shown correctly |
| Professional profile | Want certifications and specializations visible |
| Control over bio | Don't want admins writing inaccurate info |
| Know who's coming | (Future) See expected attendance |

**Goals:**
- Attract members to their classes
- Build personal brand within the club
- Ensure accurate representation of their expertise

---

## Goals & Success Metrics

### Business Objectives

| Objective | Metric | Target |
|-----------|--------|--------|
| Increase member engagement with schedule | % of active members using Bot/Mini App monthly | 50% within 3 months of launch |
| Reduce schedule-related inquiries | Decrease in direct questions to staff | 70% reduction |
| Improve class attendance | Average attendance per class | 15% increase |
| Establish digital channel stickiness | Returning users (weekly active / monthly active) | >40% WAU/MAU ratio |

### User Success Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Time to find today's schedule | From opening bot/app to seeing today's classes | <2 seconds |
| Schedule check completion rate | Users who find what they need without abandoning | >90% |
| Reminder adoption | % of users who set at least one reminder | >30% |
| Notification engagement | % of schedule change notifications opened | >60% |
| Coach profile views | Average profile views per coach per month | Baseline + growth tracking |

### Key Performance Indicators (KPIs)

| KPI | Definition | Target |
|-----|------------|--------|
| DAU (Daily Active Users) | Unique users interacting with Bot or Mini App per day | 20% of active membership |
| Session duration | Average time spent in Mini App per session | 30-90 seconds (quick = good) |
| Reminder-to-attendance rate | % of reminded users who actually attend | >70% |
| Content freshness | Time between schedule change and system update | <5 minutes |
| Admin update frequency | How often admins update schedule/content | At least weekly |
| Error rate | Failed interactions (bot commands, app loads) | <1% |

---

## MVP Scope

### Core Features (Must Have)

| # | Feature | Description | Rationale |
|---|---------|-------------|-----------|
| 1 | **Today's Schedule View** | Bot command `/today` and Mini App home screen showing today's classes | Core user need; "2 second" benchmark |
| 2 | **Weekly Calendar View** | Mini App calendar grid for browsing upcoming week | Members plan ahead; need to see full week |
| 3 | **Training Details** | Name, description, duration, coach, difficulty (visual), impact type, equipment needed | Rich info for decision-making |
| 4 | **Difficulty Indicators** | Visual badges/colors: Beginner / Intermediate / Advanced | Quick scanning; emerged from coach feedback |
| 5 | **Filter by Date** | Select specific date to view classes | Basic navigation requirement |
| 6 | **Filter by Training Type** | Filter: Cardio, Strength, Yoga, etc. | Help users find preferred activities |
| 7 | **Filter by Difficulty** | Filter: Beginner / Intermediate / Advanced | Match user's fitness level |
| 8 | **Filter by Coach** | Filter to see specific coach's classes | "I follow Maria's classes" use case |
| 9 | **Coach Profiles** | Name, photo, bio, certifications, specializations | Builds trust; helps members choose |
| 10 | **Coach's Upcoming Classes** | List of classes this coach teaches (linked from profile) | Easy discovery of favorite coach's schedule |
| 11 | **Club Information** | Name, address, contact, working hours, social links | Basic info always accessible |
| 12 | **"Remind Me" Button** | Bot sends reminder 1 hour before selected class | Key differentiator from channel |
| 13 | **Schedule Change Notifications** | Bot pushes notification when class cancelled/changed | Critical for member trust and accuracy |
| 14 | **Admin: Manage Schedule** | Web-based admin panel to create/edit/delete classes | Required for content management |
| 15 | **Admin: Manage Coaches** | Add/edit coach profiles from admin panel | Required for content management |
| 16 | **Admin: Update Club Info** | Edit club contact details, hours | Required for content management |

### Out of Scope for MVP

| Feature | Reason for Exclusion |
|---------|----------------------|
| Booking/Reservation System | Adds significant complexity; start with view-only, add later if needed |
| User Accounts/Login | Anonymous browsing first; accounts add friction |
| Attendance Tracking | Requires booking system; deferred |
| Payment Processing | Phase 2/3 feature; regulatory complexity |
| Multi-location Support | No second club confirmed; avoid premature architecture |
| Multilingual Support | Single market MVP; add i18n later if needed |
| .ics Calendar Export | Complex UX; "Remind Me" via bot is simpler MVP solution |
| Google/Apple Calendar Deep Integration | OAuth complexity; defer to Phase 2 |
| Coach Self-Service Portal | Admins manage profiles; coach portal is future enhancement |
| Advanced Analytics Dashboard | Basic metrics in admin; full dashboard is Phase 2 |
| Waitlist for Full Classes | Requires booking system first |
| User Favorites/Preferences | Requires user accounts; defer |

### MVP Success Criteria

| Criteria | Target |
|----------|--------|
| Functional completeness | All 16 core features working end-to-end |
| Performance | Schedule loads in <2 seconds on 3G connection |
| Reliability | 99% uptime; notifications delivered within 1 minute of change |
| Adoption | 100+ unique users in first month |
| User satisfaction | Qualitative feedback: "easier than channel" |
| Admin usability | Non-technical staff can update schedule without training |

---

## Post-MVP Vision

### Phase 2 Features

*To be implemented after MVP validation and user feedback*

| # | Feature | Description | Trigger for Implementation |
|---|---------|-------------|---------------------------|
| 1 | Booking/Reservation System | Reserve spots in limited-capacity classes (spinning, small groups) | User demand + capacity management pain |
| 2 | User Accounts | Optional registration for personalized experience | Need for booking, favorites, or history |
| 3 | Favorites & Preferences | Save favorite coaches, training types; personalized home screen | User account system in place |
| 4 | Waitlist for Full Classes | Join waitlist; get notified if spot opens | Booking system required first |
| 5 | Attendance History | View past classes attended | User accounts + booking required |
| 6 | Calendar Export (.ics) | Download class to Google/Apple/Outlook calendar | User requests; complements reminders |
| 7 | Advanced Filters | Filter by time of day, duration, equipment needed | User feedback on filter gaps |
| 8 | Class Ratings & Reviews | Members rate classes; visible on training details | User accounts required |
| 9 | Analytics Dashboard | Admin dashboard: popular classes, peak times, coach performance | Business intelligence need |
| 10 | Coach Self-Service | Coaches update own bio, mark availability | Coach demand + admin burden reduction |

### Long-Term Vision (1-2 Years)

| Area | Vision |
|------|--------|
| **Member Experience** | Fully personalized fitness companion in Telegram — knows your preferences, suggests classes, tracks your progress, celebrates milestones |
| **Club Operations** | Zero-friction schedule management; AI-assisted class planning based on demand patterns; automated notifications |
| **Coach Engagement** | Coaches build following within the platform; members subscribe to favorite coaches; coaches see their impact metrics |
| **Business Intelligence** | Real-time insights into member behavior, class economics, optimal scheduling; data-driven decisions |
| **Ecosystem** | Telegram becomes the central hub for all member-club interactions beyond just schedule |

### Expansion Opportunities

| Opportunity | Description | Prerequisites |
|-------------|-------------|---------------|
| Multi-Location Support | Single club expands to 2+ locations; shared coach profiles, location-specific schedules | Confirmed expansion plans; architecture refactor |
| White-Label / SaaS | Offer platform to other fitness clubs as a service | Proven success with first club; multi-tenant architecture |
| Payment Integration | Membership payments, class packages, drop-in fees via Telegram | User accounts; payment gateway integration; compliance |
| Personal Training Booking | Book 1-on-1 sessions with coaches | Booking system; coach availability calendar |
| Merchandise / Shop | Sell gym merchandise, supplements via Mini App | E-commerce integration; inventory management |
| Fitness Challenges | Club-wide challenges, leaderboards, gamification | User accounts; engagement features |
| Integration with Wearables | Sync with fitness trackers; post-workout summaries | API integrations; user consent |
| AI Recommendations | "Based on your history, try this class" | User accounts; attendance data; ML model |

---

## Technical Considerations

### Platform Requirements

| Requirement | Specification |
|-------------|---------------|
| **Target Platforms** | Telegram (iOS, Android, Desktop, Web) via Mini App + Bot |
| **Telegram Mini App** | WebApp running inside Telegram; must work on all Telegram clients |
| **Telegram Bot** | Standard Bot API for commands, notifications, inline buttons |
| **Browser/OS Support** | Whatever Telegram's embedded WebView supports (modern browsers) |
| **Admin Panel** | Web-based; modern browsers (Chrome, Firefox, Safari, Edge) |
| **Performance Requirements** | Schedule view loads <2 seconds on 3G; Bot responds <1 second |
| **Offline Support** | Not required for MVP (Telegram requires internet anyway) |
| **Minimum Telegram Version** | Support versions from past 2 years |

### Technology Preferences

| Layer | Preference | Rationale |
|-------|------------|-----------|
| **Mini App Frontend** | React / Vue / Svelte | Modern, component-based; good Telegram Mini App support |
| **Bot Framework** | Node.js (grammY / Telegraf) or Python (aiogram) | Mature Telegram bot libraries |
| **Backend API** | Node.js (NestJS) or Python (FastAPI) | Type-safe, scalable, good ecosystem |
| **Database** | PostgreSQL | Relational data (schedules, coaches, classes); proven reliability |
| **Hosting/Infrastructure** | Cloud (AWS / GCP / DigitalOcean / Railway) | Scalable; managed services reduce ops burden |
| **Admin Panel** | React + existing backend | Reuse frontend skills; single codebase benefits |

*Note: Final technology decisions to be made during architecture phase.*

### Architecture Considerations

**Repository Structure:**
```
Option A: Monorepo (Recommended for MVP)
├── /apps
│   ├── /mini-app        # Telegram Mini App (frontend)
│   ├── /bot             # Telegram Bot
│   └── /admin           # Admin web panel
├── /libs
│   └── /shared          # Shared types, utilities
└── /infrastructure      # Docker, deployment configs
```

**Service Architecture:**

| Component | Description |
|-----------|-------------|
| **API Server** | Single backend serving Mini App, Bot, and Admin |
| **Bot Service** | Webhook-based; receives Telegram updates, sends notifications |
| **Database** | PostgreSQL with connection pooling |
| **File Storage** | Cloud storage for coach photos (S3 / Cloudinary) |
| **Cache** | Optional Redis for session/rate limiting (Phase 2) |

**Integration Requirements:**

| Integration | Purpose | Priority |
|-------------|---------|----------|
| Telegram Bot API | Bot commands, notifications | MVP |
| Telegram Mini App SDK | WebApp integration, user context | MVP |
| Cloud Storage | Coach photo hosting | MVP |
| Email (optional) | Admin notifications | Nice-to-have |
| Calendar APIs | Google/Apple calendar export | Phase 2 |
| Payment Gateway | Payments processing | Phase 3 |

**Security/Compliance:**

| Concern | Approach |
|---------|----------|
| **User Data** | Minimal PII collection; Telegram user ID only for reminders |
| **Authentication** | Telegram's built-in user verification for Mini App; Admin panel has separate auth |
| **Data Privacy** | GDPR-friendly: no tracking without consent; clear data usage |
| **API Security** | Telegram webhook verification; HTTPS only; rate limiting |
| **Admin Access** | Role-based access control; audit logging |

---

## Constraints & Assumptions

### Constraints

| Category | Constraint | Impact |
|----------|------------|--------|
| **Platform** | Must work inside Telegram only; no standalone mobile app | Architecture limited to Telegram Mini App + Bot |
| **Platform** | Telegram Mini App limitations (bundle size, no push from Mini App) | Forces hybrid Bot + Mini App approach |
| **Platform** | Telegram channel is broadcast-only | Channel used for announcements; interactivity via Bot/Mini App |
| **User Base** | Target users must have Telegram installed | Users without Telegram cannot access; acceptable for this market |
| **Budget** | To be defined | Affects team size, timeline, hosting choices |
| **Timeline** | To be defined | Affects MVP scope; may need to cut features |
| **Resources** | To be defined | Team composition affects technology choices |
| **Technical** | No existing fitness management system to integrate | Must build schedule management from scratch |
| **Technical** | Single club initially | No multi-tenant complexity in MVP |
| **Operational** | Non-technical staff must manage content | Admin UI must be simple and intuitive |

### Key Assumptions

**User Assumptions:**

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 1 | Target users actively use Telegram daily | Low adoption if users don't check Telegram |
| 2 | Members prefer Telegram over a dedicated app | Investment in wrong platform |
| 3 | "Remind me" via bot is sufficient; full calendar integration not critical for MVP | Users may still miss classes |
| 4 | Anonymous browsing is acceptable; users don't need accounts for MVP | Can't personalize or track individual usage |

**Business Assumptions:**

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 5 | Fitness club will dedicate staff time to maintain content | Stale data makes system useless |
| 6 | Club schedule is relatively stable (not changing hourly) | Real-time sync architecture may be needed |
| 7 | Single club focus is sufficient for MVP | May need multi-location sooner than expected |
| 8 | MVP success will unlock budget for Phase 2 | Features may stall after MVP |

**Technical Assumptions:**

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 9 | Telegram's platform will remain stable and available | Platform dependency risk |
| 10 | Telegram Mini App performance is acceptable on all devices | May need optimization or fallback |
| 11 | Webhook-based bot can handle notification volume | May need queue system for scale |
| 12 | Cloud hosting costs will be manageable | Budget overrun if traffic spikes |

**Market Assumptions:**

| # | Assumption | Risk if Wrong |
|---|------------|---------------|
| 13 | Competitors don't have equivalent Telegram solutions | May not be differentiator |
| 14 | Members value convenience over features | May need booking sooner |

---

## Risks & Open Questions

### Key Risks

| # | Risk | Likelihood | Impact | Mitigation Strategy |
|---|------|------------|--------|---------------------|
| 1 | Telegram Platform Dependency | Medium | High | Monitor Telegram API changes; design abstraction layer for future platform flexibility |
| 2 | Low User Adoption | Medium | High | Soft launch with engaged members; gather feedback early; promote via existing channel |
| 3 | Content Staleness | Medium | High | Simple admin UI; assign dedicated content owner; automated reminders to update |
| 4 | Telegram API Rate Limits | Low | Medium | Implement message queuing; batch notifications; monitor usage |
| 5 | Mini App Performance Issues | Medium | Medium | Performance testing on low-end devices; optimize bundle size; lazy loading |
| 6 | Scope Creep | High | Medium | Strict MVP definition; defer all non-core features; weekly scope reviews |
| 7 | Coach Photo Quality | Low | Low | Provide image guidelines; admin can reject poor quality |
| 8 | Timezone Confusion | Medium | Medium | Always display times in club's local timezone; clear labeling |
| 9 | Last-Minute Change Notification Delays | Low | High | Webhook reliability; fallback notification mechanism; monitoring/alerting |
| 10 | Admin Panel Complexity | Medium | Medium | User testing with actual staff; iterative simplification |

### Open Questions

**Product Questions:**

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 1 | What is the current average class attendance? (For baseline metrics) | Club Manager | High |
| 2 | How many active members does the club have? | Club Manager | High |
| 3 | Is booking/reservation needed for MVP or can it wait? | Stakeholders | High |
| 4 | How often does the schedule change? (Daily? Weekly?) | Club Manager | Medium |
| 5 | Are there capacity-limited classes that urgently need reservation? | Club Manager | Medium |
| 6 | Does the club have existing branding guidelines? | Club Manager | Low |

**Technical Questions:**

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 7 | What is the budget range? | Stakeholders | High |
| 8 | What is the target launch timeline? | Stakeholders | High |
| 9 | Is there existing tech infrastructure to integrate with? | Club / Tech Team | Medium |
| 10 | Preferred hosting region? (Data residency concerns?) | Stakeholders | Medium |
| 11 | Who will handle ongoing maintenance and hosting? | Stakeholders | Medium |

**Operational Questions:**

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| 12 | Who specifically will manage content in the admin panel? | Club Manager | High |
| 13 | What's the process when a coach is sick? (Who updates, how fast?) | Club Manager | Medium |
| 14 | Should coaches have access to edit their own profiles? | Club Manager | Low |

### Areas Needing Further Research

| # | Research Topic | Why | Suggested Approach |
|---|----------------|-----|-------------------|
| 1 | Telegram Mini App Best Practices | Ensure optimal performance and UX | Review Telegram docs; study successful Mini Apps |
| 2 | Competitor Analysis | Understand existing fitness Telegram bots/apps | Search Telegram for fitness bots; analyze features |
| 3 | Telegram Bot Rate Limits | Plan notification architecture | Review Telegram API docs; calculate expected volume |
| 4 | User Research: Telegram Usage | Validate assumption that members use Telegram | Quick survey of 20-30 members |
| 5 | Similar Product Case Studies | Learn from successes and failures | Research gym apps, scheduling tools, Telegram bots |
| 6 | GDPR / Privacy Compliance | Ensure legal compliance | Consult privacy requirements for user data |

---

## Appendices

### A. Research Summary

*Based on elicitation session conducted during project brief creation:*

**Elicitation Methods Applied:**

| Method | Key Findings |
|--------|--------------|
| Risk & Platform Analysis | Telegram has notification limits, no offline mode, no native calendar API; must use hybrid approach |
| Requirements Critique | Gaps identified: booking system, user auth, capacity management, search, analytics |
| Agile Team Perspective | Solution is 70% backend CMS, 30% Telegram UI; needs clear MVP prioritization |
| Critical Challenge | Multi-tenant architecture premature; content maintenance is hidden operational cost |
| Platform Decision Analysis | Hybrid (Bot + Mini App) is optimal; neither alone satisfies all requirements |
| Goal Alignment | 78% aligned; scope creep risks on multi-location and multilingual |
| Stakeholder Roundtable | Booking for limited-capacity classes identified as critical gap |

**Platform Decision Summary:**

| Option | Verdict | Rationale |
|--------|---------|-----------|
| Bot Only | Rejected | Cannot provide rich calendar UI, coach profiles |
| Mini App Only | Rejected | Cannot send push notifications |
| **Hybrid (Bot + Mini App)** | Selected | Best of both: rich UI + notifications |

---

### B. Stakeholder Input

*Virtual stakeholder roundtable conducted during elicitation:*

**Participants:**

| Persona | Role | Key Concerns |
|---------|------|--------------|
| Anna | Gym Member (Busy Professional) | Speed, simplicity, reminders, coach info |
| Viktor | Fitness Coach | Difficulty indicators, certifications, equipment lists, profile control |
| Elena | Gym Manager | Quick updates, instant notifications, capacity management |
| Dmitri | Gym Owner | ROI, analytics, scalability, marketing opportunities |

**Consensus Requirements:**
- Today's schedule visible in <2 seconds
- Visual difficulty indicators
- Equipment list per training
- Instant schedule change notifications
- "Remind me" functionality
- Simple admin interface

**Identified Conflicts & Resolutions:**

| Conflict | Resolution |
|----------|------------|
| Booking vs. simplicity | View-only for MVP; booking in Phase 2 for capacity-limited classes |
| Profile edit control | Admin manages; coaches notified of changes |
| Multi-location scope | Design extensible; build single-tenant MVP |

---

### C. References

**Telegram Documentation:**
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [Mini App Best Practices](https://core.telegram.org/bots/webapps#best-practices)

**Related Research (To Be Conducted):**
- Competitor analysis of fitness Telegram bots
- Case studies of successful Telegram Mini Apps
- User survey on Telegram usage patterns

**Project Documents:**
- This project brief: `docs/brief.md`

---

## Next Steps

### Immediate Actions

| # | Action | Owner | Priority | Dependency |
|---|--------|-------|----------|------------|
| 1 | Answer open questions #7 and #8 (budget and timeline) | Stakeholders | Critical | Blocks all planning |
| 2 | Confirm content owner (who manages admin panel) | Club Manager | Critical | Blocks operational planning |
| 3 | Get baseline metrics (active members, avg attendance) | Club Manager | High | Needed for success criteria |
| 4 | Decide on booking for MVP (or confirm deferral) | Stakeholders | High | Affects scope and timeline |
| 5 | Conduct competitor research | Analyst / PM | High | Informs feature prioritization |
| 6 | Validate Telegram usage assumption | Club Manager | High | Quick member survey |
| 7 | Review and approve this Project Brief | Stakeholders | Critical | Gates PRD creation |
| 8 | Hand off to PM for PRD creation | Analyst → PM | High | After brief approval |

### Approval Checklist

Before proceeding to PRD, confirm:

- [ ] Budget range confirmed
- [ ] Timeline expectations set
- [ ] MVP scope approved (16 core features)
- [ ] Booking deferred to Phase 2 (or added to MVP)
- [ ] Content owner identified
- [ ] Open questions assigned and in progress

---

## PM Handoff

This Project Brief provides the full context for **FitSchedule Telegram**.

**For the Product Manager:**

Please start in 'PRD Generation Mode'. Review this brief thoroughly to work with the user to create the PRD section by section, asking for any necessary clarification or suggesting improvements.

**Key inputs for PRD:**
- MVP scope: 16 core features defined
- User segments: Members (primary), Admins (secondary), Coaches (tertiary)
- Technical direction: Hybrid Bot + Mini App, monorepo, PostgreSQL
- Constraints: Telegram-only, single club, non-technical admin users
- Risks: Platform dependency, adoption, content staleness
- Success metrics: 50% adoption in 3 months, <2 second load times

**Recommended PRD sections to prioritize:**
1. User stories for each of the 16 MVP features
2. Detailed UI/UX requirements for Mini App
3. Bot command specifications
4. Admin panel requirements
5. Data model design
6. API specifications
7. Notification logic

---

*Document generated with BMAD-METHOD™ Project Brief Template v2.0*
