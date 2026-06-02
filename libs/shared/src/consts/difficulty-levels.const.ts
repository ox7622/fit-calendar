/**
 * Difficulty level identifiers shared between backend (training-type
 * metadata) and frontend (filter chips, class cards). The Russian labels
 * are the single source of truth — every consumer reads from this map
 * instead of redeclaring its own.
 */
export type TDifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export const DIFFICULTY_LEVEL_LABELS: Record<TDifficultyLevel, string> = {
    beginner: 'Начальный',
    intermediate: 'Средний',
    advanced: 'Продвинутый',
};
