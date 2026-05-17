/**
 * Story 6.6 — class-validator-friendly enums for the create/update DTOs.
 * The runtime arrays are needed for `@IsIn(...)`; the entity itself holds
 * the canonical TS types via `TDifficulty` / `TImpactType`.
 */
export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const IMPACT_TYPES = ['cardio', 'strength', 'flexibility', 'balance'] as const;
