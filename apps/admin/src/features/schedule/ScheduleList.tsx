import type { IAdminScheduleItem } from '@/shared/api';
import { format, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, SquarePen } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { findOverlappingIds } from './bulk/find-overlapping-ids';

interface IDayGroup {
    headerLabel: string;
    date: Date;
    items: IAdminScheduleItem[];
}

function groupByDate(items: IAdminScheduleItem[]): IDayGroup[] {
    const map = new Map<string, IDayGroup>();
    for (const item of items) {
        const start = parseISO(item.startTime);
        const key = format(start, 'yyyy-MM-dd');
        const group = map.get(key);
        if (group) {
            group.items.push(item);
        } else {
            map.set(key, {
                headerLabel: formatDayHeader(start),
                date: start,
                items: [item],
            });
        }
    }
    return Array.from(map.values());
}

function formatDayHeader(date: Date): string {
    if (isSameDay(date, new Date())) {
        return `Сегодня, ${format(date, 'd MMMM', { locale: ru })}`;
    }
    return format(date, 'd MMMM, EEEE', { locale: ru });
}

interface IScheduleListProps {
    items: IAdminScheduleItem[];
    onCreateForDay: (day: Date) => void;
}

export function ScheduleList({ items, onCreateForDay }: IScheduleListProps): JSX.Element {
    const navigate = useNavigate();
    const groups = groupByDate(items);
    const overlappingIds = useMemo(() => findOverlappingIds(items), [items]);

    if (items.length === 0) {
        return <p className="text-body-secondary text-center py-8">Занятий в выбранном диапазоне нет.</p>;
    }

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <section key={group.headerLabel} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.headerLabel}
                    </h3>
                    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                        {group.items.map((item) => {
                            const isCancelled = item.status === 'cancelled';
                            const isOverlapping = overlappingIds.has(item.id);
                            const start = parseISO(item.startTime);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => navigate(`/schedule/${item.id}`)}
                                    title={isOverlapping ? 'Пересечение по времени у тренера' : undefined}
                                    className={`group flex w-full items-center gap-4 px-4 py-2 text-left text-sm transition-colors hover:bg-muted/50 ${
                                        isOverlapping ? 'ring-2 ring-inset ring-error' : ''
                                    }`}
                                >
                                    <span className="w-36 shrink-0 font-mono whitespace-nowrap">
                                        {format(start, 'HH:mm', { locale: ru })}
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            · {item.durationMinutes} мин
                                        </span>
                                    </span>
                                    <span
                                        className={`min-w-0 flex-[2] truncate ${
                                            isCancelled ? 'text-muted-foreground line-through' : 'font-medium'
                                        }`}
                                    >
                                        {item.trainingType.name}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                        {item.coach.name}
                                    </span>
                                    <span className="w-28 shrink-0">
                                        {isCancelled ? (
                                            <span className="inline-flex items-center rounded-md bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                                                Отменено
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                                                Активно
                                            </span>
                                        )}
                                    </span>
                                    <SquarePen
                                        size={16}
                                        className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                                    />
                                </button>
                            );
                        })}
                        <div className="p-2">
                            <button
                                type="button"
                                onClick={() => onCreateForDay(group.date)}
                                aria-label={`Добавить занятие на ${format(group.date, 'd MMMM', { locale: ru })}`}
                                className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/50 hover:text-foreground"
                            >
                                <Plus size={16} />
                                Добавить занятие
                            </button>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}
