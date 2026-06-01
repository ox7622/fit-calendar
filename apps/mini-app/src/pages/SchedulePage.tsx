import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Moon, SlidersHorizontal, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useTheme } from '@/app/providers/ThemeProvider';
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

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SchedulePage(): JSX.Element {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const today = useMemo(() => new Date(), []);
    const [selectedDate, setSelectedDate] = useState<Date>(today);

    // Mon–Sun rail for the week containing the selected day.
    const weekDays = useMemo(() => {
        const monday = startOfWeek(selectedDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    }, [selectedDate]);

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

    // Load schedule when the selected day or filters change
    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        scheduleApi
            .getByDate(dateKey, filtersToParams(filters))
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
    }, [selectedDate, filters]);

    const activeFilterCount = countActiveFilters(filters);

    return (
        <div className="flex flex-col h-full">
            {/* Header: weekday caption + date h1 + filter button */}
            <div className="px-4 pt-4 pb-3 flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-caption capitalize">{format(selectedDate, 'EEEE', { locale: ru })}</p>
                    <h1 className="heading-1 mt-0.5">{format(selectedDate, 'd MMMM', { locale: ru })}</h1>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
                        className="w-10 h-10 rounded-[10px] bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                    >
                        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(true)}
                        className="relative w-10 h-10 rounded-[10px] bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                        aria-label="Фильтры"
                    >
                        <SlidersHorizontal size={18} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 text-[11px] font-semibold bg-primary text-primary-foreground rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Day rail */}
            <div className="px-4 pb-3">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {weekDays.map((day) => {
                        const isActive = isSameDay(day, selectedDate);
                        return (
                            <button
                                key={day.toISOString()}
                                type="button"
                                onClick={() => setSelectedDate(day)}
                                className={[
                                    'flex-shrink-0 min-w-[50px] rounded-xl py-2 flex flex-col items-center gap-0.5 transition-colors active:scale-95',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-card text-muted-foreground hover:text-foreground',
                                ].join(' ')}
                            >
                                <span className="text-[11px] font-medium uppercase">
                                    {capitalize(format(day, 'EEEEEE', { locale: ru }))}
                                </span>
                                <span className="text-lg font-bold leading-none">{format(day, 'd')}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 h-0.5 w-2/3 rounded-full bg-gradient-to-r from-primary/50 to-transparent" />
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
                            {activeFilterCount > 0 ? 'Нет занятий по выбранным фильтрам' : 'В этот день занятий нет'}
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
                            <ClassCard key={cls.id} class={cls} onClick={() => navigate(`/schedule/${cls.id}`)} />
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
