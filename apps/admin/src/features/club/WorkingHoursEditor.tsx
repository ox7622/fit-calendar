import type { IDayHours, TDayKey, TWorkingHours } from '@/shared/api';

interface IWorkingHoursEditorProps {
    value: TWorkingHours;
    onChange: (next: TWorkingHours) => void;
    disabled?: boolean;
}

const DAY_ORDER: TDayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABEL: Record<TDayKey, string> = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
};

const DEFAULT_OPEN: IDayHours = { open: '09:00', close: '21:00' };

export function WorkingHoursEditor({ value, onChange, disabled }: IWorkingHoursEditorProps) {
    const setDay = (day: TDayKey, next: IDayHours | null): void => {
        onChange({ ...value, [day]: next });
    };

    return (
        <div className="space-y-2">
            {DAY_ORDER.map((day) => {
                const hours = value[day];
                const isOpen = !!hours;
                const invalid = isOpen && hours && hours.close <= hours.open;

                return (
                    <div key={day} className="flex flex-wrap items-center gap-3">
                        <span className="w-32 text-body">{DAY_LABEL[day]}</span>

                        <label className="inline-flex items-center gap-1">
                            <input
                                type="checkbox"
                                checked={isOpen}
                                onChange={(e) => setDay(day, e.target.checked ? { ...DEFAULT_OPEN } : null)}
                                disabled={disabled}
                            />
                            <span className="text-sm text-body-secondary">Открыто</span>
                        </label>

                        <input
                            type="time"
                            value={hours?.open ?? ''}
                            onChange={(e) => hours && setDay(day, { ...hours, open: e.target.value })}
                            disabled={disabled || !isOpen}
                            className="rounded border border-border bg-surface p-1 text-body disabled:opacity-50"
                        />
                        <span className="text-body-secondary">—</span>
                        <input
                            type="time"
                            value={hours?.close ?? ''}
                            onChange={(e) => hours && setDay(day, { ...hours, close: e.target.value })}
                            disabled={disabled || !isOpen}
                            className="rounded border border-border bg-surface p-1 text-body disabled:opacity-50"
                        />

                        {invalid && (
                            <span className="text-sm text-destructive">Закрытие должно быть позже открытия</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default WorkingHoursEditor;
