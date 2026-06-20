import type { IAdminScheduleItem, IScheduleFormPayload } from '@/shared/api';
import { addWeeks, differenceInCalendarWeeks, parseISO } from 'date-fns';

export function buildWeekCopy(
    items: IAdminScheduleItem[],
    sourceWeekStart: Date,
    targetWeekStart: Date,
): IScheduleFormPayload[] {
    const weekDelta = differenceInCalendarWeeks(targetWeekStart, sourceWeekStart, { weekStartsOn: 1 });
    return items
        .filter((it) => it.status === 'scheduled')
        .map((it) => ({
            trainingTypeId: it.trainingType.id,
            coachId: it.coach.id,
            durationMinutes: it.durationMinutes,
            startTime: addWeeks(parseISO(it.startTime), weekDelta).toISOString(),
        }));
}
