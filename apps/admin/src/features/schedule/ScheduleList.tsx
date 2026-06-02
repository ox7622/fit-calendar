import type { IAdminScheduleItem } from '@/shared/api';
import { format, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { SquarePen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface IDayGroup {
    headerLabel: string;
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
}

export function ScheduleList({ items }: IScheduleListProps): JSX.Element {
    const navigate = useNavigate();
    const groups = groupByDate(items);

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
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-left text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 w-28 uppercase tracking-wide">Время</th>
                                    <th className="px-4 py-2 uppercase tracking-wide">Занятие</th>
                                    <th className="px-4 py-2 uppercase tracking-wide">Тренер</th>
                                    <th className="px-4 py-2 w-32 uppercase tracking-wide">Статус</th>
                                    <th className="px-4 py-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {group.items.map((item) => {
                                    const isCancelled = item.status === 'cancelled';
                                    const start = parseISO(item.startTime);
                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => navigate(`/schedule/${item.id}`)}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        >
                                            <td className="px-4 py-2 font-mono">
                                                {format(start, 'HH:mm', { locale: ru })}
                                                <span className="text-muted-foreground text-xs ml-1">
                                                    · {item.durationMinutes} мин
                                                </span>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span
                                                    className={
                                                        isCancelled
                                                            ? 'text-muted-foreground line-through'
                                                            : 'font-medium'
                                                    }
                                                >
                                                    {item.trainingType.name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{item.coach.name}</td>
                                            <td className="px-4 py-2">
                                                {isCancelled ? (
                                                    <span className="inline-flex items-center text-xs font-medium rounded-md bg-error/10 text-error px-2 py-0.5">
                                                        Отменено
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-xs font-medium rounded-md bg-success/15 text-success px-2 py-0.5">
                                                        Активно
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <SquarePen
                                                    size={16}
                                                    className="inline text-muted-foreground transition-colors hover:text-foreground"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
        </div>
    );
}
