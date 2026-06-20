/**
 * Contract between admin schedule mutations and the broadcast notification
 * listener. Admin writes emit; the reminder listener subscribes. Kept in a
 * dependency-free file so both sides can import the constants without dragging
 * unrelated module wiring through their import graph.
 *
 * Every payload carries a `snapshot` so the listener never re-reads the DB —
 * essential for SCHEDULE_DELETED, where the row no longer exists.
 */

/** Class details sufficient to build any notification message body. */
export interface IScheduleSnapshot {
    className: string;
    coachName: string;
    /** The class start time the message should display (new time for edits). */
    startTime: Date;
}

export const SCHEDULE_CREATED_EVENT = 'schedule.created';

export interface IScheduleCreatedPayload {
    scheduleEntryId: string;
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_CHANGED_EVENT = 'schedule.changed';

export interface IScheduleChangedPayload {
    scheduleEntryId: string;
    oldStartTime: Date;
    newStartTime: Date;
    oldDurationMinutes: number;
    newDurationMinutes: number;
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_CANCELLED_EVENT = 'schedule.cancelled';

export interface IScheduleCancelledPayload {
    scheduleEntryId: string;
    /** Free-text reason the admin supplied; null when omitted. */
    cancellationReason: string | null;
    /** Customer UUIDs that had pending reminders at cancel time. Retained for
     *  audit/forensics; recipients are now ALL linked customers, not these. */
    affectedCustomerIds: string[];
    snapshot: IScheduleSnapshot;
}

export const SCHEDULE_DELETED_EVENT = 'schedule.deleted';

export interface IScheduleDeletedPayload {
    scheduleEntryId: string;
    snapshot: IScheduleSnapshot;
}
