import type { ValueTransformer } from 'typeorm';

/**
 * Postgres `date` columns are surfaced as strings by node-postgres
 * (e.g. '2026-06-13'), while TypeORM entities declare them as Date. Without
 * this transformer the type lies — `.getTime()` / `.toISOString()` throw at
 * runtime even though the compiler is happy. Apply to every
 * `@Column({ type: 'date' })`.
 */
export const DATE_ONLY_TRANSFORMER: ValueTransformer = {
    from: (value: string | Date | null): Date | null => {
        if (value === null || value === undefined) return null;
        return value instanceof Date ? value : new Date(value);
    },
    to: (value: Date | string | null | undefined): Date | string | null | undefined => value,
};
