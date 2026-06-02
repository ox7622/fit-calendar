/**
 * Story 6.3 + 6.4 — contract between admin schedule mutations and reminder
 * notification listeners (Stories 5.4 + 5.5).
 *
 * Admin writes emit; reminder listeners subscribe. Keeping the contract in a
 * dedicated file (with no other imports) lets both sides reference these
 * constants without dragging unrelated module wiring through their import graph.
 */

export const SCHEDULE_CHANGED_EVENT = 'schedule.changed';

export interface IScheduleChangedPayload {
    scheduleEntryId: string;
    oldStartTime: Date;
    newStartTime: Date;
    oldDurationMinutes: number;
    newDurationMinutes: number;
}

export const SCHEDULE_CANCELLED_EVENT = 'schedule.cancelled';

export interface IScheduleCancelledPayload {
    scheduleEntryId: string;
    /** Free-text reason the admin supplied; null when omitted. */
    cancellationReason: string | null;
    /** Customer UUIDs that had pending reminders at the moment of cancellation.
     *  Captured BEFORE the pending reminders are deleted so the listener has
     *  the full set even after the DB update.
     *  Post-7.2 rename: was `affectedUserIds` in the original story draft. */
    affectedCustomerIds: string[];
    /** Snapshot of class details for the listener's message body. */
    snapshot: {
        className: string;
        startTime: Date;
        coachName: string;
    };
}
