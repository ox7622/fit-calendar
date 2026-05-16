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
    /** Customer UUIDs that had pending reminders at the moment of cancellation. */
    affectedCustomerIds: string[];
    /** Snapshot of the class details captured *before* cancel — listener needs them for the message body. */
    snapshot: {
        className: string;
        coachName: string;
        startTime: Date;
        durationMinutes: number;
        cancellationReason: string | null;
    };
}
