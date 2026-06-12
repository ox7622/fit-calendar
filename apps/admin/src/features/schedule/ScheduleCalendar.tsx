import { useMemo } from 'react';

import type { IAdminScheduleItem } from '@/shared/api';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

import { findOverlappingIds } from './bulk/find-overlapping-ids';

interface IScheduleCalendarProps {
    items: IAdminScheduleItem[];
    rangeStart: Date;
    /** When true, clicking a class toggles selection instead of opening it. */
    selectMode?: boolean;
    selectedIds?: Set<string>;
    onToggleSelect?: (id: string) => void;
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

export function ScheduleCalendar({
    items,
    rangeStart,
    selectMode = false,
    selectedIds,
    onToggleSelect,
}: IScheduleCalendarProps): JSX.Element {
    const navigate = useNavigate();
    const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(rangeStart, i));
    const overlappingIds = useMemo(() => findOverlappingIds(items), [items]);

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
                                    const isOverlapping = overlappingIds.has(item.id);
                                    const isSelected = selectMode && (selectedIds?.has(item.id) ?? false);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() =>
                                                selectMode
                                                    ? onToggleSelect?.(item.id)
                                                    : navigate(`/schedule/${item.id}`)
                                            }
                                            aria-pressed={selectMode ? isSelected : undefined}
                                            title={
                                                selectMode
                                                    ? 'Нажмите, чтобы выбрать для удаления'
                                                    : isOverlapping
                                                    ? 'Несколько занятий в одно время'
                                                    : undefined
                                            }
                                            className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors ${
                                                isCancelled
                                                    ? 'bg-error/10 text-error hover:bg-error/20 line-through'
                                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                                            }${isOverlapping ? ' ring-2 ring-error ring-offset-1' : ''}${
                                                isSelected ? ' outline outline-2 outline-offset-1 outline-primary' : ''
                                            }`}
                                        >
                                            <div className="flex items-start gap-1">
                                                {selectMode && (
                                                    <span
                                                        aria-hidden
                                                        className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border text-[9px] leading-none ${
                                                            isSelected
                                                                ? 'border-primary bg-primary text-primary-foreground'
                                                                : 'border-current opacity-50'
                                                        }`}
                                                    >
                                                        {isSelected ? '✓' : ''}
                                                    </span>
                                                )}
                                                <span className="font-semibold truncate">{item.trainingType.name}</span>
                                            </div>
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
