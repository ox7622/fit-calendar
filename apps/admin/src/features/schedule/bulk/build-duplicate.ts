import type { IAdminScheduleItem, IScheduleFormPayload } from '@/shared/api';
import { parseISO, set } from 'date-fns';

export function buildDuplicate(source: IAdminScheduleItem, targetDates: Date[]): IScheduleFormPayload[] {
    const srcTime = parseISO(source.startTime);
    return targetDates.map((date) => ({
        trainingTypeId: source.trainingType.id,
        coachId: source.coach.id,
        durationMinutes: source.durationMinutes,
        startTime: set(date, {
            hours: srcTime.getHours(),
            minutes: srcTime.getMinutes(),
            seconds: 0,
            milliseconds: 0,
        }).toISOString(),
    }));
}
