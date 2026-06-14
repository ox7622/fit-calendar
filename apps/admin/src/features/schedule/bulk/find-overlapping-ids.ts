import type { IAdminScheduleItem } from '@/shared/api';

interface IInterval {
    id: string;
    coachId: string;
    start: number;
    end: number;
}

/**
 * Ids of scheduled classes whose time ranges intersect for the same coach.
 * Back-to-back ranges (one ends exactly when the next starts) are not overlap.
 */
export function findOverlappingIds(items: IAdminScheduleItem[]): Set<string> {
    const intervals: IInterval[] = [];
    for (const it of items) {
        if (it.status !== 'scheduled') continue;
        const start = new Date(it.startTime).getTime();
        intervals.push({
            id: it.id,
            coachId: it.coach.id,
            start,
            end: start + it.durationMinutes * 60_000,
        });
    }
    const result = new Set<string>();
    for (const [i, a] of intervals.entries()) {
        for (const [j, b] of intervals.entries()) {
            if (j <= i) continue;
            if (a.coachId !== b.coachId) continue;
            if (a.start < b.end && b.start < a.end) {
                result.add(a.id);
                result.add(b.id);
            }
        }
    }
    return result;
}
