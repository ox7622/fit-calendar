import type { IAdminScheduleItem } from '@/shared/api';
import { describe, expect, it } from 'vitest';

import { findOverlappingIds } from './find-overlapping-ids';

interface IMakeOpts {
    coachId?: string;
    durationMinutes?: number;
    status?: 'scheduled' | 'cancelled';
}

const make = (id: string, startTime: string, opts: IMakeOpts = {}): IAdminScheduleItem => ({
    id,
    startTime,
    durationMinutes: opts.durationMinutes ?? 60,
    status: opts.status ?? 'scheduled',
    cancellationReason: null,
    trainingType: { id: 't1', name: 'Йога', difficulty: 'beginner' },
    coach: { id: opts.coachId ?? 'c1', name: 'Мария', photoUrl: null },
});

describe('findOverlappingIds', () => {
    it('flags classes whose ranges intersect for the same coach', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z'), // 15:00–16:00
            make('b', '2026-06-08T15:30:00.000Z'), // 15:30–16:30 → overlap
            make('c', '2026-06-08T17:00:00.000Z'), // 17:00–18:00 → no overlap
        ]);
        expect(result).toEqual(new Set(['a', 'b']));
    });

    it('does not flag overlapping classes with different coaches', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z', { coachId: 'c1' }),
            make('b', '2026-06-08T15:00:00.000Z', { coachId: 'c2' }),
        ]);
        expect(result.size).toBe(0);
    });

    it('treats touching ranges as non-overlap', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z'), // 15:00–16:00
            make('b', '2026-06-08T16:00:00.000Z'), // 16:00–17:00
        ]);
        expect(result.size).toBe(0);
    });

    it('uses per-class durationMinutes (short classes do not overlap by default)', () => {
        // With default 60-min duration these would overlap (15:00–16:00 vs 15:30–16:30).
        // With explicit short durations they don't: 15:00–15:20 vs 15:30–15:50.
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z', { durationMinutes: 20 }),
            make('b', '2026-06-08T15:30:00.000Z', { durationMinutes: 20 }),
        ]);
        expect(result.size).toBe(0);
    });

    it('uses per-class durationMinutes (a long class swallows a later short one)', () => {
        // a: 15:00 + 120 min → 15:00–17:00
        // b: 16:00 + 15 min  → 16:00–16:15, fully inside a → overlap
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z', { durationMinutes: 120 }),
            make('b', '2026-06-08T16:00:00.000Z', { durationMinutes: 15 }),
        ]);
        expect(result).toEqual(new Set(['a', 'b']));
    });

    it('ignores cancelled classes', () => {
        const result = findOverlappingIds([
            make('a', '2026-06-08T15:00:00.000Z'),
            make('b', '2026-06-08T15:00:00.000Z', { status: 'cancelled' }),
        ]);
        expect(result.size).toBe(0);
    });
});
