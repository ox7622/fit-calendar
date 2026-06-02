import { DIFFICULTY_LEVEL_LABELS, IMPACT_TYPES, type TDifficultyLevel, type TImpactType } from '@fitcalendar/shared';
import { X } from 'lucide-react';
import type { JSX } from 'react';

import type { CoachOption, ScheduleFilters, TrainingTypeOption } from '@/shared/types/filter.types';

import { ImpactTypeBadge } from './ImpactTypeBadge';

interface FilterSheetProps {
    filters: ScheduleFilters;
    onChange: (filters: ScheduleFilters) => void;
    onClose: () => void;
    trainingTypes: TrainingTypeOption[];
    coaches: CoachOption[];
}

const difficultyOptions: { value: TDifficultyLevel; label: string }[] = (
    ['beginner', 'intermediate', 'advanced'] as const
).map((value) => ({ value, label: DIFFICULTY_LEVEL_LABELS[value] }));

function countActiveFilters(filters: ScheduleFilters): number {
    let count = 0;
    if (filters.difficultyLevel) count++;
    if (filters.impactType && filters.impactType.length > 0) count++;
    if (filters.trainingTypeId) count++;
    if (filters.coachId) count++;
    return count;
}

export function FilterSheet({ filters, onChange, onClose, trainingTypes, coaches }: FilterSheetProps): JSX.Element {
    const activeCount = countActiveFilters(filters);

    function toggleDifficulty(level: TDifficultyLevel): void {
        onChange({
            ...filters,
            difficultyLevel: filters.difficultyLevel === level ? undefined : level,
        });
    }

    function toggleImpactType(type: TImpactType): void {
        const current = filters.impactType ?? [];
        const updated = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
        onChange({ ...filters, impactType: updated.length > 0 ? updated : undefined });
    }

    function selectTrainingType(id: string): void {
        onChange({ ...filters, trainingTypeId: filters.trainingTypeId === id ? undefined : id });
    }

    function selectCoach(id: string): void {
        onChange({ ...filters, coachId: filters.coachId === id ? undefined : id });
    }

    function clearAll(): void {
        onChange({});
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end animate-[fade-in_0.15s_ease-out]">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-label="Закрыть фильтры"
            />

            {/* Sheet */}
            <div className="relative bg-background rounded-t-2xl max-h-[85vh] flex flex-col animate-[slide-up_0.3s_ease-out]">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-2">
                        <h2 className="heading-3">Фильтры</h2>
                        {activeCount > 0 && (
                            <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Закрыть"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                    {/* Difficulty section */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Уровень сложности
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            {difficultyOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggleDifficulty(opt.value)}
                                    className={[
                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                                        filters.difficultyLevel === opt.value
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-card text-foreground border-border hover:border-primary/50',
                                    ].join(' ')}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Impact type section */}
                    <section>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                            Тип нагрузки
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            {IMPACT_TYPES.map((type) => {
                                const isSelected = (filters.impactType ?? []).includes(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => toggleImpactType(type)}
                                        className={[
                                            'rounded-lg transition-colors border px-1.5 py-0.5',
                                            isSelected ? 'border-primary/50' : 'border-transparent',
                                        ].join(' ')}
                                    >
                                        <ImpactTypeBadge type={type} size="md" />
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Training type section */}
                    {trainingTypes.length > 0 && (
                        <section>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Вид тренировки
                            </h3>
                            <div className="space-y-1">
                                {trainingTypes.map((tt) => (
                                    <button
                                        key={tt.id}
                                        type="button"
                                        onClick={() => selectTrainingType(tt.id)}
                                        className={[
                                            'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors',
                                            filters.trainingTypeId === tt.id
                                                ? 'bg-primary/20 text-primary font-medium'
                                                : 'text-foreground hover:bg-muted',
                                        ].join(' ')}
                                    >
                                        {tt.name}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Coach section */}
                    {coaches.length > 0 && (
                        <section>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                                Тренер
                            </h3>
                            <div className="space-y-1">
                                {coaches.map((coach) => (
                                    <button
                                        key={coach.id}
                                        type="button"
                                        onClick={() => selectCoach(coach.id)}
                                        className={[
                                            'w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2.5 transition-colors',
                                            filters.coachId === coach.id
                                                ? 'bg-primary/20 text-primary font-medium'
                                                : 'text-foreground hover:bg-muted',
                                        ].join(' ')}
                                    >
                                        {coach.photoUrl ? (
                                            <img
                                                src={coach.photoUrl}
                                                alt={coach.name}
                                                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                                                {coach.name
                                                    .split(' ')
                                                    .map((p) => p[0] ?? '')
                                                    .join('')
                                                    .toUpperCase()
                                                    .slice(0, 2)}
                                            </div>
                                        )}
                                        {coach.name}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer buttons */}
                <div className="px-4 py-4 border-t border-border/50 flex gap-3">
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={activeCount === 0}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Сбросить
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Применить
                    </button>
                </div>
            </div>
        </div>
    );
}
