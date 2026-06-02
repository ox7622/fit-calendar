/**
 * Story 6.6 — class-validator-friendly enums for the create/update DTOs.
 * Sourced from `@fitcalendar/shared` so the admin frontend, backend
 * validators and Swagger schemas all read from one list. The entity itself
 * holds the canonical TS types via `TDifficulty` / `TImpactType` (from
 * `@fitcalendar/db`).
 */
export { IMPACT_TYPES } from '@fitcalendar/shared';
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
