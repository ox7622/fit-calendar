# Implementation Readiness Report

**Date:** 2026-05-02
**Prepared by:** John (PM)
**Scope:** PRD v1.2 (40 stories across 7 epics)
**Decision:** **READY WITH CAVEATS** — see Gaps below

---

## Executive Summary

| Check                         | Status                                                                       |
| ----------------------------- | ---------------------------------------------------------------------------- |
| PRD ↔ Stories coverage (FRs)  | ✅ All 30 FRs mapped to stories                                              |
| PRD ↔ Stories coverage (NFRs) | ✅ All 13 active NFRs accounted for; NFR12 + NFR14 explicitly deferred       |
| Architecture doc alignment    | ⚠️ **Gap** — architecture.md does not yet describe Epic 7 entities/flows     |
| UX spec alignment             | ⚠️ **Gap** — front-end-spec.md does not yet describe Epic 7 screens/flows    |
| Story technical accuracy      | ✅ All 40 stories validated; v1.1+ patches applied                           |
| Cross-story dependencies      | ✅ All flagged in story Dev Notes                                            |
| Sequencing constraints        | ✅ Documented (recommended order: 6.1 → 7.1 → 7.2 → 5.x → 7.3-7.6 → 6.2-6.7) |

**Net:** the story files are the dev's primary contract and they're solid. The two doc gaps mean the architect and UX designer should refresh their respective documents before formal dev sign-off, but the implementation work itself is unblocked because story files contain the necessary detail.

---

## 1. PRD ↔ Stories — Functional Requirement Coverage

| FR                                                          | Story         |
| ----------------------------------------------------------- | ------------- |
| FR1-FR3 (today/upcoming/weekly views)                       | 2.1, 2.2, 2.3 |
| FR4-FR6 (difficulty, impact, equipment)                     | 2.5, 3.1, 3.5 |
| FR7-FR10 (filtering by type/difficulty/coach, multi-filter) | 3.3, 3.4      |
| FR11-FR12 (coach profiles + their classes)                  | 4.1, 4.2, 4.3 |
| FR13-FR14 (club info + map)                                 | 4.4, 4.5      |
| FR15-FR19 (reminders + notifications)                       | 5.1-5.6       |
| FR20-FR23 (admin schedule, coaches, club info)              | 6.1-6.7       |
| **FR24** (plan catalog public)                              | 7.1           |
| **FR25** (track customer membership)                        | 7.4           |
| **FR26** (admin manage plans)                               | 7.1           |
| **FR27** (admin customer mgmt + CSV)                        | 7.2, 7.3      |
| **FR28** (Mini App phone-link)                              | 7.2           |
| **FR29** (admin assign membership)                          | 7.4           |
| **FR30** (guest visit + freeze logging)                     | 7.5, 7.6      |

✅ All 30 FRs covered.

---

## 2. PRD ↔ Stories — Non-Functional Coverage

| NFR                                       | Coverage                                 |
| ----------------------------------------- | ---------------------------------------- |
| NFR1-NFR3 (perf targets)                  | Implicit — respected by all stories      |
| NFR4 (iOS+Android Telegram)               | Design constraint                        |
| NFR5 (Russian)                            | Every UI/notification story uses Russian |
| NFR6 (Telegram native auth)               | 1.5, refactored in 7.2                   |
| NFR7 (HTTPS)                              | Deployment / 1.6                         |
| NFR8 (admin auth)                         | 6.1                                      |
| NFR9 (TG rate limits)                     | 5.3 (best-effort, no active limiting)    |
| NFR10 (graceful notification degradation) | 5.3, 5.4, 5.5 retry logic                |
| NFR11 (daily backups)                     | Ops                                      |
| ~~NFR12~~ (audit logging)                 | **Deferred to Phase 2**                  |
| NFR13 (image optimization ≤500KB)         | 6.5 (Cloudinary `quality: 'auto'`)       |
| ~~NFR14~~ (offline)                       | **Deferred to Phase 2**                  |
| NFR15 (Docker deployable)                 | 1.1, 1.6                                 |

✅ Active NFRs covered or explicitly deferred.

---

## 3. Architecture Doc Alignment — ⚠️ Gap

`docs/architecture.md` (and the sharded `docs/architecture/*.md` files) were authored for the original 6-epic scope. **None of the following Epic 7 concepts are documented:**

| Architecture section      | Epic 7 content missing                                                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4 Data Models            | `Customer` (renamed from User), `MembershipPlan`, `CustomerMembership`, `GuestVisit`, `FreezeEvent`                                                                                                                                |
| §5 API Specification      | `POST /me/link-phone`, `/membership-plans`, `/admin/customers`, `/admin/customers/import`, `/admin/customers/:id/memberships`, `/admin/memberships/:id/{cancel,guest-visits,freezes}`, `/admin/membership-plans`, `/me/membership` |
| §6 Components             | `MembershipModule`, `MembershipPlanModule`, `CustomerImportService`                                                                                                                                                                |
| §8 Core Workflows         | "Member links Telegram identity by phone," "Admin assigns plan with auto-computed expiration," "Guest visit decrements counter atomically," "Freeze shifts endDate"                                                                |
| §9 Database Schema        | `membership_plans`, `customer_memberships`, `guest_visits`, `freeze_events` tables; `users → customers` rename; `reminders.userId → reminders.customerId`                                                                          |
| §10 Frontend Architecture | New routes (`/me`, `/plans`), profile icon in AppShell, `useCustomerStore` (renamed from useUserStore), `useRemindersStore`, `LinkPhonePrompt` component                                                                           |
| §11 Backend Architecture  | `TelegramAuthGuard` refactor (no auto-upsert), new `RequiresLinkedCustomer` guard, `@Customer()` + `@TelegramIdentity()` decorators replacing `@TelegramUser()`                                                                    |

### Severity assessment

**MEDIUM** — the dev can work from story files alone, since each Epic 7 story includes its own architectural detail in Dev Notes. But:

-   **A future architect or contractor** picking up the project will read `architecture.md` first and miss Epic 7 entirely
-   **Cross-cutting decisions** (e.g. why `Customer` is admin-managed vs auto-created) live only in story 7.2's Dev Notes — they should be hoisted to the architecture doc
-   **The data model diagram** (§4.3 ER diagram) is now incomplete

### Remediation

Update `architecture.md` (and sharded files) to include Epic 7 sections. Estimated effort: **half a day** of architect or tech-writer work. Bundle with the BMad `bmad-agent-tech-writer` skill (`Update Standards` or `Validate Document`).

This is **not a blocker** for starting Story 6.1, 7.1, or 7.2 implementation. But should land before Epic 7 dev work picks up steam (i.e., before Story 7.4 starts, which is when the data model complexity peaks).

---

## 4. UX Spec Alignment — ⚠️ Gap

`docs/front-end-spec.md` similarly doesn't cover Epic 7. Specifically missing:

| UX spec section             | Epic 7 content missing                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| §2 Information Architecture | `/me` profile page, `/plans` catalog, `LinkPhonePrompt` modal, profile icon in AppShell, "View plans" link from ClubPage        |
| §3 User Flows               | "First-time member opens Mini App and links phone" flow; "Member views their membership card"; "Admin assigns plan to customer" |
| §4 Wireframes               | Profile page mockup, plans catalog cards, membership card with countdown, link-phone prompt screen, freeze banner               |
| §5 Component Library        | `MembershipCard`, `LinkPhonePrompt`, `PlanCard`, `ChipInput` (also referenced in 6.5/6.6)                                       |

### Severity assessment

**MEDIUM** — similar to the architecture gap. Story 7.4's Dev Notes specify the membership card layout in enough detail that a dev can ship it, but a UX designer reviewing the spec for visual consistency before launch will find the spec incomplete.

### Remediation

Update `front-end-spec.md` with Epic 7 screens and flows. Estimated: **half to one day**. Useful follow-on if a UX designer is available; if not, the dev work can proceed from story files.

---

## 5. Story Technical Accuracy — ✅

All 40 stories have been validated:

-   **Stories 1.1–4.5** (existing, complete): not re-validated; assumed correct since they're shipped
-   **Stories 5.1–6.7** (13 stories): validated in Epic 5/6 sweep, 18 patches applied, all at v1.1
-   **Stories 7.1–7.6** (6 stories): validated in Epic 7 sweep, 5 patches applied, all at v1.1

Validation caught: wrong dep versions, fake bcrypt hash in seed, missing dep installs, `pg` driver date-column behavior, migration approach for renames, transaction injection patterns, single-flight test patterns. All resolved before any dev work started.

---

## 6. Cross-Story Dependencies — ✅

Sequencing recommendations are documented in story Dev Notes:

| Sequence                   | Reason                                                         |
| -------------------------- | -------------------------------------------------------------- |
| 6.1 first                  | Admin auth foundation; Epic 6 + 7 depend on it                 |
| 7.1 next                   | Plan catalog has no upstream deps; safe early shipper          |
| 7.2 before 5.x             | 7.2 changes the auth model that 5.1/5.2/5.6 currently assume   |
| 5.3 before 5.4 / 5.5       | BotService.sendNotification + retry helper land in 5.3         |
| 6.3 / 6.4 before 5.4 / 5.5 | 5.4/5.5 listen to events emitted by 6.3/6.4                    |
| 7.4 before 7.5 / 7.6       | Membership counters initialized before they can be decremented |

---

## 7. Recommended Action Items Before Implementation Kickoff

| #   | Item                                                                  | Owner                           | Cost     | Blocks                                                              |
| --- | --------------------------------------------------------------------- | ------------------------------- | -------- | ------------------------------------------------------------------- |
| 1   | Update `architecture.md` to include Epic 7 entities/APIs/components   | Architect or tech-writer        | ~0.5 day | Nothing immediate; recommended before Story 7.4 dev                 |
| 2   | Update `front-end-spec.md` to include Epic 7 screens/flows            | UX designer (or PM as fallback) | ~0.5 day | Nothing immediate; recommended before Story 7.1 / 7.4 frontend work |
| 3   | Generate `sprint-status.yaml` via `bmad-sprint-planning`              | PM via skill                    | ~10 min  | Story-cycle skills (bmad-create-story, bmad-dev-story) need this    |
| 4   | (Optional) Manually re-key bcrypt hash in `libs/db/src/seeds/seed.ts` | Anyone                          | ~2 min   | Story 6.1's smoke test                                              |

Item 4 is technically inside Story 6.1 (Task 14 from the validation patch). Listing here as a reminder that the seed has a known-broken placeholder hash from Story 1.2.

---

## 8. Final Decision

**READY WITH CAVEATS.**

The story files are sufficient as the implementation contract. Dev can begin Story 6.1 (admin auth) immediately while the architecture and UX spec catchup happens in parallel. Sprint planning is the next BMad workflow step.

**Risk:** if dev moves faster than the architecture/UX spec updates, Epic 7 stories may surface design questions that can't be answered from the spec alone. Mitigation: encourage dev to flag these explicitly so they can be batched into the architecture revision.

---

_Generated as part of the BMad implementation-readiness gate. See PRD §13 for the original checklist results report (epic-1-6 scope)._
