# Soft-Delete Audit

Survey of every hard-delete site in the API, the guards that protect them, and
where soft-delete would actually pay off vs. where hard-delete is correct.

**Two real bugs surfaced during this audit** (see §3) — they're flagged but
unfixed in this doc. Treat them as follow-up tickets.

## 1. Entity-level current state

| Entity | Has `isActive` flag? | Hard-delete path exists? | Used for soft-delete today? |
|---|---|---|---|
| Customer | ✅ | `DELETE /admin/customers/:id` | Yes — `isActive=false` |
| Coach | ✅ | `DELETE /admin/coaches/:id` | Yes — `isActive=false` |
| TrainingType | ✅ | `DELETE /admin/training-types/:id` | Yes — `isActive=false` |
| MembershipPlan | ✅ | `DELETE /admin/plans/:id` | Yes — `isActive=false` |
| AdminUser | ✅ | (no admin-facing delete) | Yes — `isActive=false` |
| CustomerMembership | ❌ | (no delete endpoint) | Uses `status` enum (`active`/`expired`/`cancelled`) |
| ScheduleEntry | ❌ | `DELETE /admin/schedule/:id` (past + no reminders) | Uses `status` enum (`scheduled`/`cancelled`) |
| Reminder | ❌ | Member unsubscribe + bulk delete on cancel | Uses `status` enum (`pending`/`sent`/`failed`) |
| GuestVisit | ❌ | `DELETE /admin/guest-visits/:id` (undo) | No — undo IS the delete |
| FreezeEvent | ❌ | `DELETE /admin/freezes/:id` (undo) | No — undo IS the delete |
| ClubInfo | ❌ | (no delete — singleton) | N/A |

Pattern: **every entity with a meaningful lifecycle already has a soft state** —
either an `isActive` boolean (for "I exist but hide me from new operations") or
a `status` enum (for richer state machines like `scheduled→cancelled→expired`).

## 2. Per-call-site analysis

### 2.1 `MembershipPlan.remove()` — `membership-plans.service.ts:84`

- **Guard:** `countReferences(planId)` — **stub, always returns 0** (see §3.1).
- **FK behavior:** `customer_memberships.planId` has `ON DELETE NO ACTION`. A real
  delete attempt on a referenced plan would fail at the DB with FK violation
  surfaced as 500.
- **Intended path:** `isActive=false` is the everyday soft delete; hard delete
  is for "created by mistake, never used".
- **Verdict:** Don't add a `deletedAt` column. Fix the broken guard so the 409
  matches reality.

### 2.2 `ScheduleEntry.remove()` — `admin-schedule.service.ts:267`

- **Guards:** past class only AND zero reminders (any status). Returns 409
  otherwise.
- **Soft-state equivalent:** the `status='cancelled'` transition (Story 6.4)
  IS the soft delete — it keeps the row, emits notifications, deletes pending
  reminders. The hard-delete path is a separate, narrower escape hatch for
  "admin created a class in 2025 by mistake."
- **Verdict:** Two-tier pattern is fine. No change.

### 2.3 `Reminder.remove()` — `reminder.service.ts:96`

- **Guard:** owner-only check (`where: { id, customerId }`) — non-owners get 404,
  not 403, so existence isn't leaked.
- **Why hard:** member unsubscribed before the reminder fired. The `status`
  enum tracks the original lifecycle (`pending`/`sent`/`failed`); using it for
  "user changed their mind" would conflate two different concepts.
- **Verdict:** Keep hard delete.

### 2.4 `Reminder` bulk delete via `deletePendingByClass` — `reminder.service.ts:253`

- **Trigger:** admin cancels a class (Story 6.4).
- **Behavior:** deletes only `status='pending'` rows; `sent`/`failed` stay as
  audit trail.
- **Why hard:** the pending reminders no longer point at a sensible action
  (the class is cancelled). Keeping them would require a fourth status value
  (`pending_cancelled`?) that no consumer would read.
- **Verdict:** Keep hard delete.

### 2.5 `Coach.remove()` — `admin-coaches.service.ts:101`

- **Guard:** `ScheduleEntry.count({ where: { coachId } }) > 0` → 409.
- **Race:** the count check isn't transactional — a class created between the
  check and the `remove()` would trip the FK constraint. User sees 500 instead
  of 409. Low likelihood, called out in `docs/deploy/release-checklist.md §8`.
- **Verdict:** Pattern is correct. Race is acceptable for single-reception-desk MVP.

### 2.6 `TrainingType.remove()` — `admin-training-types.service.ts:81`

- Identical shape to 2.5 (ScheduleEntry count guard, same race).
- **Verdict:** Same as 2.5.

### 2.7 `GuestVisit.delete()` — `membership.service.ts:292`

- **Trigger:** admin undoes a recorded visit (fat-finger correction).
- **Why hard:** undo IS the delete. The counter increments back, the row is
  gone. Soft-deleting would leave a "tombstone" row that conveys nothing the
  counter doesn't already.
- **Verdict:** Keep hard delete.

### 2.8 `FreezeEvent.delete()` — `membership.service.ts:408`

- Same shape as 2.7.
- **Verdict:** Keep hard delete.

### 2.9 `Customer.remove()` — `customer.service.ts:240`

- **Guard:** reminder count > 0 → returns `'has_dependencies'`. **Does NOT
  check memberships** (see §3.2). The code comment even admits the gap:
  > Has-dependencies guard counts reminders today and will count memberships
  > once Story 7.4 lands.
- **Cascade chain on FK:**
    - `Customer` → `CustomerMembership` (`CASCADE`) → `GuestVisit` (`CASCADE`) + `FreezeEvent` (`CASCADE`)
    - `Customer` → `Reminder` (`CASCADE`)

  Hard-deleting a customer with no reminders today **silently wipes** every
  membership, every guest visit, every freeze event in their history.
- **Verdict:** Highest-risk hard delete in the codebase. Fix the broken guard
  (§3.2). Don't add `deletedAt` — `isActive=false` already provides the
  hide-from-roster soft state.

## 3. Real bugs found during this audit

### 3.1 `MembershipPlansService.countReferences` is a stub

```ts
async countReferences(planId: string): Promise<number> {
    void planId;
    return 0;
}
```

The comment promises Story 7.4 would wire the real query. 7.4 shipped. Nobody
came back. Today an admin can delete any plan; the Postgres FK rejects the
delete at the DB level with `ON DELETE NO ACTION`, but the user sees 500
instead of the 409 the controller is trying to surface.

**Fix:** inject the `CustomerMembership` repo, count rows where `planId = ?`,
return the count.

### 3.2 `CustomerService.deleteCustomer` doesn't count memberships

Same shape. Same abandoned TODO. The reminder count is the only gate; a
customer with active memberships but no reminders can be deleted, and the
CASCADE chain silently wipes their entire history.

**Fix:** also count `customer_memberships.customerId = ?`. Optionally also
count `reminders` via the existing path. Return `'has_dependencies'` if
either is non-zero.

## 4. Recommendations

### 4.1 Don't add a `deletedAt` column to anything

The codebase already has two soft-delete patterns:

1. **`isActive: boolean`** — hide from rosters, keep for history (Coach,
   TrainingType, Customer, Plan, AdminUser).
2. **`status` enum** — explicit state machine (CustomerMembership,
   ScheduleEntry, Reminder).

Both are clearer than a nullable timestamp because they read as intent
(`isActive=false` means something specific; `deletedAt IS NOT NULL` doesn't).
Adding a third pattern would just give code paths three ways to ask "is this
gone?" and three places to forget to filter.

### 4.2 Fix the two broken guards in §3 (separate commits)

Both are small, both have an existing 409 surface that's currently lying. Each
~15 min including tests.

### 4.3 Document the cascade chain in the Customer entity

The fact that deleting a Customer also deletes their memberships, guest visits,
freezes, and reminders is non-obvious from reading just the customer-side code.
A short comment on `customer.entity.ts` next to the `@OneToMany` relations (or
on the `deleteCustomer` method) would save the next person 10 minutes of
hunting through FKs.

### 4.4 Skip: don't soft-delete `ScheduleEntry` / `Reminder` / `GuestVisit` / `FreezeEvent`

Each has a clear hard-delete justification (audit-via-undo, mistake correction,
or already-soft via `status`). Forcing a `deletedAt` field on them would add
tombstones nobody reads.

### 4.5 Defer: cross-entity audit log

The right answer to "who deleted this and when?" isn't soft-delete — it's an
`audit_log` table that records every mutation with `actor + entity + before +
after`. Out of scope for MVP, worth keeping in mind once we have ≥1 customer
who wants compliance reports.

## 5. Summary

- Pattern is correct; no entity-wide soft-delete migration needed.
- Two broken `has_dependencies` guards (plan + customer) need fixing — both
  promised by 7.4 dev notes but never landed.
- The Customer hard-delete cascade chain is genuinely scary; the fix is small
  (count memberships) but the bug is real.
- The race in 2.5 / 2.6 (Coach + TrainingType delete) is documented as
  MVP-acceptable in the release checklist; no change here.
