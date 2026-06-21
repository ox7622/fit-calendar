import type { ValueTransformer } from 'typeorm';

/**
 * Postgres `bigint` round-trips as a string through the driver. This transformer
 * maps it to a JS `number` on read so entity properties typed `number` are
 * actually numbers (Telegram ids are well within `Number.MAX_SAFE_INTEGER`).
 */
export const BIGINT_NUMBER_TRANSFORMER: ValueTransformer = {
    to: (value: number | null): number | null => value,
    from: (value: string | null): number | null => (value === null ? null : Number(value)),
};
