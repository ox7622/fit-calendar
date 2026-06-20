/**
 * Allowed values for `Customer.reminderMinutes` (Story 5.2). Enforced at the
 * DTO boundary via `@IsIn` so a determined client can't slip a `99999` in and
 * break Story 5.3's `notifyAt = startTime − reminderMinutes` math.
 */
export const REMINDER_MINUTES_OPTIONS = [15, 30, 60, 120] as const;

export type TReminderMinutes = (typeof REMINDER_MINUTES_OPTIONS)[number];
