import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { findOverlappingIds } from './find-overlapping-ids';

const make = (id: string, startTime: string, status: 'scheduled' | 'cancelled' = 'scheduled'): IAdminScheduleItem => ({
    id,
    startTime,
    durationMinutes: 60,
    status,
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: 'c1', name: 'Мария', photoUrl: null },
});

describe('findOverlappingIds', () => {
    it('flags 2+ scheduled classes that share the exact start time', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z'),
            make('b', '2026-06-08T15:00:00.000Z'),
            make('c', '2026-06-08T16:00:00.000Z'),
        ]);
        expect(result).toEqual(new Set(['a', 'b']));
    });

    it('ignores cancelled classes', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z'),
            make('b', '2026-06-08T15:00:00.000Z', 'cancelled'),
        ]);
        expect(result.size).toBe(0);
    });
});
