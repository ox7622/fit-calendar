// TODO(6.5/6.6): wire coach + training-type dropdowns to /admin/coaches/options
// and /admin/training-types/options once those endpoints exist. For 6.2 only the
// status filter is implemented; the other two filter dropdowns are placeholders.
import type { TAdminScheduleStatusFilter } from '@/shared/api';

interface IScheduleFiltersProps {
    status: TAdminScheduleStatusFilter;
    onStatusChange: (status: TAdminScheduleStatusFilter) => void;
}

const STATUS_OPTIONS: { value: TAdminScheduleStatusFilter; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'scheduled', label: 'Активные' },
    { value: 'cancelled', label: 'Отменённые' },
];

export function ScheduleFilters({ status, onStatusChange }: IScheduleFiltersProps): JSX.Element {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-muted-foreground">
                Статус:
                <select
                    value={status}
                    onChange={(e) => onStatusChange(e.target.value as TAdminScheduleStatusFilter)}
                    className="ml-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </label>

            <select
                disabled
                title="Будет доступно в Story 6.5"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option>Все тренеры</option>
            </select>

            <select
                disabled
                title="Будет доступно в Story 6.6"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option>Все типы занятий</option>
            </select>
        </div>
    );
}
