import { useEffect, useState } from 'react';

import { ScheduleCalendar } from '@/features/schedule/ScheduleCalendar';
import { ScheduleFilters } from '@/features/schedule/ScheduleFilters';
import { ScheduleList } from '@/features/schedule/ScheduleList';
import {
    adminScheduleApi,
    type IAdminScheduleItem,
    type IAdminScheduleQuery,
    type TAdminScheduleStatusFilter,
} from '@/shared/api';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, List as ListIcon } from 'lucide-react';

const DEFAULT_RANGE_DAYS = 7;
type TView = 'list' | 'calendar';

function formatRangeLabel(from: Date, to: Date): string {
    const fromLabel = format(from, 'd MMMM', { locale: ru });
    const toLabel = format(to, 'd MMMM', { locale: ru });
    return `${fromLabel} – ${toLabel}`;
}

export function DashboardPage() {
    const [view, setView] = useState<TView>('list');
    const [rangeStart, setRangeStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [status, setStatus] = useState<TAdminScheduleStatusFilter>('all');
    const [items, setItems] = useState<IAdminScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const rangeEnd = addDays(rangeStart, DEFAULT_RANGE_DAYS - 1);

    useEffect(() => {
        let cancelled = false;
        const query: IAdminScheduleQuery = {
            from: rangeStart.toISOString(),
            // Add a day so the end-of-day classes on rangeEnd are included.
            to: addDays(rangeEnd, 1).toISOString(),
            status,
            pageSize: 200,
        };
        setLoading(true);
        adminScheduleApi
            .list(query)
            .then((response) => {
                if (cancelled) return;
                setItems(response.items);
                setError(null);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить расписание');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [rangeStart, status]);

    const onPrev = (): void => setRangeStart((prev) => subWeeks(prev, 1));
    const onNext = (): void => setRangeStart((prev) => addWeeks(prev, 1));
    const onToday = (): void => setRangeStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="heading-2">Расписание</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            view === 'list'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-body-secondary hover:bg-muted'
                        }`}
                    >
                        <ListIcon size={16} />
                        Список
                    </button>
                    <button
                        type="button"
                        onClick={() => setView('calendar')}
                        className={`hidden lg:inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                            view === 'calendar'
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-body-secondary hover:bg-muted'
                        }`}
                    >
                        <CalendarDays size={16} />
                        Календарь
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                        aria-label="Предыдущая неделя"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium min-w-[180px] text-center">
                        {formatRangeLabel(rangeStart, rangeEnd)}
                    </span>
                    <button
                        type="button"
                        onClick={onNext}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                        aria-label="Следующая неделя"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onToday}
                        className="ml-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                        Сегодня
                    </button>
                </div>
                <ScheduleFilters status={status} onStatusChange={setStatus} />
            </div>

            {loading ? (
                <p className="text-body-secondary text-center py-8">Загрузка...</p>
            ) : error ? (
                <p className="text-destructive text-center py-8">{error}</p>
            ) : view === 'calendar' ? (
                <ScheduleCalendar items={items} rangeStart={rangeStart} />
            ) : (
                <ScheduleList items={items} />
            )}
        </div>
    );
}

export default DashboardPage;
