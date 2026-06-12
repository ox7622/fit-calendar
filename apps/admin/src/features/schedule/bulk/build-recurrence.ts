import type { IScheduleFormPayload } from '@/shared/api';
import { addDays, differenceInCalendarDays, getISODay, set } from 'date-fns';

export type TRecurrenceRange = { mode: 'dates'; from: Date; to: Date } | { mode: 'weeks'; from: Date; weeks: number };

export interface IBuildRecurrenceParams {
    trainingTypeId: string;
    coachId: string;
    durationMinutes: number;
    time: string; // "HH:mm"
    weekdays: number[]; // ISO 1=Mon..7=Sun
    range: TRecurrenceRange;
}

function rangeEnd(range: TRecurrenceRange): Date {
    return range.mode === 'dates' ? range.to : addDays(range.from, range.weeks * 7 - 1);
}

export function buildRecurrence(params: IBuildRecurrenceParams): IScheduleFormPayload[] {
    const { trainingTypeId, coachId, durationMinutes, time, weekdays, range } = params;
    const [hours, minutes] = time.split(':').map(Number);
    const end = rangeEnd(range);
    const totalDays = differenceInCalendarDays(end, range.from);

    const out: IScheduleFormPayload[] = [];
    for (let i = 0; i <= totalDays; i += 1) {
        const day = addDays(range.from, i);
        if (!weekdays.includes(getISODay(day))) continue;
        const startTime = set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
        out.push({ trainingTypeId, coachId, durationMinutes, startTime: startTime.toISOString() });
    }
    return out;
}
