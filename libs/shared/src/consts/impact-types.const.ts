/**
 * Canonical list of training "impact" categories. Backend's
 * `@IsIn(IMPACT_TYPES)` and the mini-app filter/badge components both read
 * from here. The training-type entity declares its own `TImpactType` literal
 * union (in `@fitcalendar/db`) which is structurally identical — kept
 * separate because the entity file ships with TypeORM decorators and we
 * don't want libs/shared to inherit that dep.
 */
export const IMPACT_TYPES = ['cardio', 'strength', 'flexibility', 'balance'] as const;
export type TImpactType = (typeof IMPACT_TYPES)[number];
