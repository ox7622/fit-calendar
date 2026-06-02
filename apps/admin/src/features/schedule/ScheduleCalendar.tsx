import type { IAdminScheduleItem } from '@/shared/api';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface IScheduleCalendarProps {
    items: IAdminScheduleItem[];
    rangeStart: Date;
}

const DAYS_IN_WEEK = 7;

function coachInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function ScheduleCalendar({ items, rangeStart }: IScheduleCalendarProps): JSX.Element {
    const navigate = useNavigate();
    const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(rangeStart, i));

    const itemsByDay: Record<string, IAdminScheduleItem[]> = {};
    for (const day of days) {
        const key = format(day, 'yyyy-MM-dd');
        itemsByDay[key] = items
            .filter((item) => isSameDay(parseISO(item.startTime), day))
            .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime());
    }

    return (
        <div className="grid grid-cols-7 gap-2 min-h-[400px]">
            {days.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayItems = itemsByDay[key] ?? [];
                const isToday = isSameDay(day, new Date());
                return (
                    <div key={key} className="flex flex-col gap-1">
                        <div
                            className={`text-xs font-semibold uppercase tracking-wide text-center pb-2 ${
                                isToday ? 'text-primary' : 'text-muted-foreground'
                            }`}
                        >
                            <div>{format(day, 'EEE', { locale: ru })}</div>
                            <div className={isToday ? 'text-primary font-bold' : 'text-foreground/70'}>
                                {format(day, 'd')}
                            </div>
                        </div>
                        <div className="flex-1 space-y-1 min-h-[150px] rounded-lg border border-border bg-card/50 p-1.5">
                            {dayItems.length === 0 ? (
                                <div className="text-xs text-muted-foreground/60 text-center pt-4">—</div>
                            ) : (
                                dayItems.map((item) => {
                                    const isCancelled = item.status === 'cancelled';
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => navigate(`/schedule/${item.id}`)}
                                            className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors ${
                                                isCancelled
                                                    ? 'bg-error/10 text-error hover:bg-error/20 line-through'
                                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                                            }`}
                                        >
                                            <div className="font-semibold truncate">{item.trainingType.name}</div>
                                            <div className="flex items-center justify-between text-[10px] mt-0.5 opacity-80">
                                                <span>{format(parseISO(item.startTime), 'HH:mm')}</span>
                                                <span>{coachInitials(item.coach.name)}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
