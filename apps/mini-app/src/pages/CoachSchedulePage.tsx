import { formatInClubTz } from '@fitcalendar/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClassCard, SkeletonCard } from '@/components';
import { useClubTimeZone } from '@/shared/club-timezone';
import { coachesApi } from '@/shared/api';
import type { ScheduleClass } from '@/shared/types/schedule.types';

interface DayGroup {
    date: string;
    classes: ScheduleClass[];
}

function groupByDate(classes: ScheduleClass[], tz: string): DayGroup[] {
    const map = new Map<string, ScheduleClass[]>();

    for (const cls of classes) {
        const dateKey = formatInClubTz(cls.startTime, tz, 'yyyy-MM-dd');
        const existing = map.get(dateKey);
        if (existing) {
            existing.push(cls);
        } else {
            map.set(dateKey, [cls]);
        }
    }

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, clsList]) => ({ date, classes: clsList }));
}

function formatDateHeader(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'd MMMM, EEEE', { locale: ru });
}

/**
 * CoachSchedulePage — Shows upcoming schedule for a coach
 * Story 4.3
 */
export function CoachSchedulePage(): JSX.Element {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const tz = useClubTimeZone();

    const [classes, setClasses] = useState<ScheduleClass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError('Некорректный идентификатор тренера');
            setIsLoading(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        coachesApi
            .getSchedule(id)
            .then((data) => {
                if (!cancelled) {
                    setClasses(data);
                    setIsLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить расписание тренера');
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    const groups = groupByDate(classes, tz);

    return (
        <div className="flex flex-col h-full">
            {/* Header with back button */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    aria-label="Назад"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="heading-2">Расписание тренера</h1>
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
                        <button type="button" onClick={() => navigate(-1)} className="text-sm text-primary underline">
                            Вернуться назад
                        </button>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <p className="text-muted-foreground text-sm">Нет предстоящих занятий</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-[fade-in_0.15s_ease-out]">
                        {groups.map((group) => (
                            <div key={group.date}>
                                {/* Date header */}
                                <p className="text-sm font-semibold text-muted-foreground mb-2 capitalize">
                                    {formatDateHeader(group.date)}
                                </p>
                                <div className="space-y-2">
                                    {group.classes.map((cls) => (
                                        <ClassCard
                                            key={cls.id}
                                            class={cls}
                                            onClick={() => navigate(`/schedule/${cls.id}`)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
