const INPUT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

const WEEKDAYS: Array<{ iso: number; label: string }> = [
    { iso: 1, label: 'Пн' },
    { iso: 2, label: 'Вт' },
    { iso: 3, label: 'Ср' },
    { iso: 4, label: 'Чт' },
    { iso: 5, label: 'Пт' },
    { iso: 6, label: 'Сб' },
    { iso: 7, label: 'Вс' },
];

export type TRangeMode = 'weeks' | 'dates';

interface IRecurrenceFieldsProps {
    weekdays: number[];
    onToggleDay: (iso: number) => void;
    rangeMode: TRangeMode;
    onRangeModeChange: (mode: TRangeMode) => void;
    weeks: number;
    onWeeksChange: (weeks: number) => void;
    toDate: string;
    onToDateChange: (date: string) => void;
    disabled?: boolean;
}

/**
 * The recurrence controls revealed by the "Повторять" checkbox in ScheduleForm:
 * weekday selection + range (N weeks or an end date). The start-date anchor and
 * class time come from the form's existing "Дата и время" field, so they are
 * intentionally NOT repeated here.
 */
export function RecurrenceFields({
    weekdays,
    onToggleDay,
    rangeMode,
    onRangeModeChange,
    weeks,
    onWeeksChange,
    toDate,
    onToDateChange,
    disabled = false,
}: IRecurrenceFieldsProps): JSX.Element {
    return (
        <div className="space-y-3 rounded-md border border-border bg-surface/40 p-3">
            <div className="space-y-1">
                <span className="block text-body-secondary">Дни недели</span>
                <div className="flex gap-1">
                    {WEEKDAYS.map((d) => (
                        <button
                            key={d.iso}
                            type="button"
                            onClick={() => onToggleDay(d.iso)}
                            disabled={disabled}
                            aria-pressed={weekdays.includes(d.iso)}
                            className={`flex-1 rounded-md py-1.5 text-sm disabled:opacity-60 ${
                                weekdays.includes(d.iso)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border border-border hover:bg-muted'
                            }`}
                        >
                            {d.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onRangeModeChange('weeks')}
                    disabled={disabled}
                    className={`flex-1 rounded-md py-1.5 text-sm disabled:opacity-60 ${
                        rangeMode === 'weeks' ? 'bg-primary/10 text-primary font-medium' : 'border border-border'
                    }`}
                >
                    N недель
                </button>
                <button
                    type="button"
                    onClick={() => onRangeModeChange('dates')}
                    disabled={disabled}
                    className={`flex-1 rounded-md py-1.5 text-sm disabled:opacity-60 ${
                        rangeMode === 'dates' ? 'bg-primary/10 text-primary font-medium' : 'border border-border'
                    }`}
                >
                    Диапазон дат
                </button>
            </div>

            {rangeMode === 'weeks' ? (
                <div className="space-y-1">
                    <label htmlFor="recurrence-weeks" className="block text-body-secondary">
                        Недель
                    </label>
                    <input
                        id="recurrence-weeks"
                        type="number"
                        min={1}
                        max={52}
                        value={weeks}
                        onChange={(e) => onWeeksChange(Number(e.target.value))}
                        className={INPUT_CLASS}
                        disabled={disabled}
                    />
                </div>
            ) : (
                <div className="space-y-1">
                    <label htmlFor="recurrence-to" className="block text-body-secondary">
                        По дату (включительно)
                    </label>
                    <input
                        id="recurrence-to"
                        type="date"
                        value={toDate}
                        onChange={(e) => onToDateChange(e.target.value)}
                        className={INPUT_CLASS}
                        disabled={disabled}
                    />
                </div>
            )}
        </div>
    );
}

export default RecurrenceFields;
