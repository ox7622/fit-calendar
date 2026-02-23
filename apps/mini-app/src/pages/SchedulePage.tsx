import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ClassCard, FilterSheet, SkeletonCard } from '@/components';
import { coachesApi, scheduleApi } from '@/shared/api';
import type { CoachOption, ScheduleFilters, TrainingTypeOption } from '@/shared/types/filter.types';
import type { ScheduleClass } from '@/shared/types/schedule.types';
import type { ScheduleFilterParams } from '@/shared/api/schedule.api';

function countActiveFilters(filters: ScheduleFilters): number {
    let count = 0;
    if (filters.difficultyLevel) count++;
    if (filters.impactType && filters.impactType.length > 0) count++;
    if (filters.trainingTypeId) count++;
    if (filters.coachId) count++;
    return count;
}

function filtersToParams(filters: ScheduleFilters): ScheduleFilterParams {
    return {
        difficultyLevel: filters.difficultyLevel,
        impactType: filters.impactType ? filters.impactType.join(',') : undefined,
        trainingTypeId: filters.trainingTypeId,
        coachId: filters.coachId,
    };
}

export function SchedulePage(): JSX.Element {
    const today = new Date();
    const navigate = useNavigate();

    const [classes, setClasses] = useState<ScheduleClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<ScheduleFilters>({});
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [trainingTypes, setTrainingTypes] = useState<TrainingTypeOption[]>([]);
    const [coaches, setCoaches] = useState<CoachOption[]>([]);

    // Load metadata (training types + coaches) once on mount
    useEffect(() => {
        scheduleApi
            .getMetadata()
            .then(setTrainingTypes)
            .catch(() => {
                // Metadata failure is non-critical — ignore silently
            });

        coachesApi
            .getList()
            .then(setCoaches)
            .catch(() => {
                // Metadata failure is non-critical — ignore silently
            });
    }, []);

    // Load schedule when filters change
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        scheduleApi
            .getToday(filtersToParams(filters))
            .then((data) => {
                if (!cancelled) {
                    setClasses(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить расписание');
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [filters]);

    const activeFilterCount = countActiveFilters(filters);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                <h1 className="heading-2">{format(today, "d MMMM, EEEE", { locale: ru })}</h1>
                <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Фильтры"
                >
                    <SlidersHorizontal size={20} />
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                            {activeFilterCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-error text-sm mb-3">{error}</p>
                        <button
                            type="button"
                            onClick={() => setFilters({ ...filters })}
                            className="text-sm text-primary underline"
                        >
                            Повторить
                        </button>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-muted-foreground text-sm">
                            {activeFilterCount > 0
                                ? 'Нет занятий по выбранным фильтрам'
                                : 'Сегодня занятий нет'}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilters({})}
                                className="mt-2 text-sm text-primary underline"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {classes.map((cls) => (
                            <ClassCard
                                key={cls.id}
                                class={cls}
                                onClick={() => navigate(`/schedule/${cls.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Filter sheet */}
            {isFilterOpen && (
                <FilterSheet
                    filters={filters}
                    onChange={setFilters}
                    onClose={() => setIsFilterOpen(false)}
                    trainingTypes={trainingTypes}
                    coaches={coaches}
                />
            )}
        </div>
    );
}
