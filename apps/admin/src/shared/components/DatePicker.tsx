import { useState } from 'react';

import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { Overlay } from './Overlay';

interface IDatePickerProps {
    value: string; // "yyyy-MM-dd" ("" = nothing selected)
    onChange: (value: string) => void;
    placeholder?: string;
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/** Theme-aware date picker (replaces native `<input type="date">`). */
export function DatePicker({ value, onChange, placeholder = 'Выберите дату' }: IDatePickerProps) {
    const [open, setOpen] = useState(false);
    const selected = value ? parseISO(value) : null;
    const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());

    const gridStart = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const pick = (d: Date): void => {
        onChange(format(d, 'yyyy-MM-dd'));
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex w-full items-center justify-between rounded border border-border bg-surface p-2 text-left text-body"
            >
                <span className={selected ? '' : 'text-muted-foreground'}>
                    {selected ? format(selected, 'd MMMM yyyy', { locale: ru }) : placeholder}
                </span>
                <CalendarIcon size={16} className="text-muted-foreground" />
            </button>
            {open && (
                <Overlay
                    onClose={() => setOpen(false)}
                    backdropClassName="z-[60] bg-black/40"
                    className="w-72 rounded-lg border border-border bg-card p-3 shadow-xl"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setViewMonth((mth) => subMonths(mth, 1))}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Предыдущий месяц"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="text-sm font-medium capitalize">
                            {format(viewMonth, 'LLLL yyyy', { locale: ru })}
                        </span>
                        <button
                            type="button"
                            onClick={() => setViewMonth((mth) => addMonths(mth, 1))}
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                            aria-label="Следующий месяц"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
                        {WEEKDAY_LABELS.map((d) => (
                            <div key={d}>{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {days.map((d) => {
                            const isSel = selected !== null && isSameDay(d, selected);
                            const isCur = isSameMonth(d, viewMonth);
                            const isToday = isSameDay(d, new Date());
                            return (
                                <button
                                    key={d.toISOString()}
                                    type="button"
                                    onClick={() => pick(d)}
                                    className={`rounded py-1 text-sm ${
                                        isSel
                                            ? 'bg-primary text-primary-foreground'
                                            : isToday
                                            ? 'font-semibold text-primary hover:bg-muted'
                                            : isCur
                                            ? 'text-foreground hover:bg-muted'
                                            : 'text-muted-foreground/50 hover:bg-muted'
                                    }`}
                                >
                                    {format(d, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </Overlay>
            )}
        </div>
    );
}
