import type { IAdminScheduleItem } from '@/shared/api';

/** Ids of scheduled classes that share an exact start time with another scheduled class. */
export function findOverlappingIds(items: IAdminScheduleItem[]): Set<string> {
    const byStart = new Map<string, string[]>();
    for (const it of items) {
        if (it.status !== 'scheduled') continue;
        const key = new Date(it.startTime).getTime().toString();
        const ids = byStart.get(key) ?? [];
        ids.push(it.id);
        byStart.set(key, ids);
    }
    const result = new Set<string>();
    for (const ids of byStart.values()) {
        if (ids.length >= 2) ids.forEach((id) => result.add(id));
    }
    return result;
}
