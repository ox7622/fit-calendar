import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import {
    adminCoachesApi,
    adminTrainingTypesApi,
    ALLOWED_DURATIONS,
    type ICoachOption,
    type IScheduleFormPayload,
    type ITrainingTypeOption,
    type TAllowedDuration,
} from '@/shared/api';

import { buildRecurrence, type TRecurrenceRange } from './bulk/build-recurrence';
import { RecurrenceFields, type TRangeMode } from './RecurrenceFields';

const INPUT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

interface IScheduleFormProps {
    initial?: Partial<IScheduleFormPayload>;
    submitLabel: string;
    onSubmit: (payload: IScheduleFormPayload) => Promise<void>;
    /**
     * When provided, a "Повторять" checkbox is shown; ticking it switches submit
     * to create the whole recurrence in one `bulkCreate`. Omit it (e.g. the edit
     * page) to keep the form single-class only.
     */
    onSubmitRecurring?: (entries: IScheduleFormPayload[]) => Promise<void>;
    onCancel?: () => void;
}

interface IScheduleFormState {
    trainingTypeId: string;
    coachId: string;
    startTime: string; // datetime-local value, e.g. "2026-05-15T10:00"
    durationMinutes: TAllowedDuration;
}

/** Convert an ISO timestamp from the API into the local datetime-local input format. */
function isoToLocal(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
        date.getMinutes(),
    )}`;
}

function toState(initial?: Partial<IScheduleFormPayload>): IScheduleFormState {
    return {
        trainingTypeId: initial?.trainingTypeId ?? '',
        coachId: initial?.coachId ?? '',
        startTime: isoToLocal(initial?.startTime),
        durationMinutes: (initial?.durationMinutes as TAllowedDuration | undefined) ?? 60,
    };
}

/**
 * Expand the form into a recurrence. The `startTime` field is a "YYYY-MM-DDTHH:mm"
 * datetime-local string: its date is the recurrence start anchor, its time is the
 * class time. Returns [] when inputs are incomplete (so the count hint reads 0 and
 * submit is blocked) — never throws.
 */
function buildRecurringEntries(
    state: IScheduleFormState,
    weekdays: number[],
    rangeMode: TRangeMode,
    weeks: number,
    toDate: string,
): IScheduleFormPayload[] {
    if (!state.trainingTypeId || !state.coachId || !state.startTime || weekdays.length === 0) return [];

    const [datePart, timePart] = state.startTime.split('T');
    if (!datePart || !timePart) return [];
    const from = new Date(`${datePart}T00:00:00`);
    if (Number.isNaN(from.getTime())) return [];

    let range: TRecurrenceRange;
    if (rangeMode === 'weeks') {
        if (weeks < 1) return [];
        range = { mode: 'weeks', from, weeks };
    } else {
        if (!toDate) return [];
        const to = new Date(`${toDate}T00:00:00`);
        if (Number.isNaN(to.getTime()) || to < from) return [];
        range = { mode: 'dates', from, to };
    }

    return buildRecurrence({
        trainingTypeId: state.trainingTypeId.trim(),
        coachId: state.coachId.trim(),
        durationMinutes: state.durationMinutes,
        time: timePart,
        weekdays,
        range,
    });
}

export function ScheduleForm({
    initial,
    submitLabel,
    onSubmit,
    onSubmitRecurring,
    onCancel,
}: IScheduleFormProps): JSX.Element {
    const [state, setState] = useState<IScheduleFormState>(() => toState(initial));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coachOptions, setCoachOptions] = useState<ICoachOption[]>([]);
    const [typeOptions, setTypeOptions] = useState<ITrainingTypeOption[]>([]);

    // Recurrence (only reachable when onSubmitRecurring is provided). The start
    // date and time come from the `startTime` field below; these add the days
    // and the range.
    const [repeat, setRepeat] = useState(false);
    const [weekdays, setWeekdays] = useState<number[]>([]);
    const [rangeMode, setRangeMode] = useState<TRangeMode>('weeks');
    const [weeks, setWeeks] = useState(4);
    const [toDate, setToDate] = useState('');

    const recurringEnabled = onSubmitRecurring !== undefined && repeat;
    const recurringEntries = recurringEnabled ? buildRecurringEntries(state, weekdays, rangeMode, weeks, toDate) : [];

    useEffect(() => {
        let cancelled = false;
        Promise.all([adminCoachesApi.getOptions(), adminTrainingTypesApi.getOptions()])
            .then(([coaches, types]) => {
                if (cancelled) return;
                setCoachOptions(coaches);
                setTypeOptions(types);
            })
            .catch(() => {
                // Non-fatal — empty options render an empty <select> with a hint.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const update = <K extends keyof IScheduleFormState>(key: K, value: IScheduleFormState[K]): void => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

    const toggleDay = (iso: number): void =>
        setWeekdays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]));

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (submitting) return;
        setError(null);

        if (!state.trainingTypeId || !state.coachId) {
            setError('Заполните все поля');
            return;
        }
        if (!state.startTime) {
            setError('Укажите дату и время');
            return;
        }

        setSubmitting(true);
        try {
            if (recurringEnabled && onSubmitRecurring) {
                if (weekdays.length === 0) {
                    setError('Выберите хотя бы один день недели');
                    return;
                }
                if (recurringEntries.length === 0) {
                    setError('В выбранном диапазоне нет занятий — проверьте дни и даты');
                    return;
                }
                await onSubmitRecurring(recurringEntries);
                return;
            }

            const payload: IScheduleFormPayload = {
                trainingTypeId: state.trainingTypeId.trim(),
                coachId: state.coachId.trim(),
                // datetime-local has no timezone — interpret as the admin's local TZ
                // and serialize as ISO (UTC). The server stores TIMESTAMP WITH TIME ZONE.
                startTime: new Date(state.startTime).toISOString(),
                durationMinutes: state.durationMinutes,
            };
            await onSubmit(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить занятие');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl" noValidate>
            <Field id="trainingTypeId" label="Тип занятия">
                <select
                    id="trainingTypeId"
                    value={state.trainingTypeId}
                    onChange={(e) => update('trainingTypeId', e.target.value)}
                    className={INPUT_CLASS}
                    disabled={submitting || typeOptions.length === 0}
                    required
                >
                    <option value="">— выберите тип занятия —</option>
                    {typeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.name}
                        </option>
                    ))}
                </select>
                {typeOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Сначала добавьте активный тип на /training-types
                    </p>
                )}
            </Field>

            <Field id="coachId" label="Тренер">
                <select
                    id="coachId"
                    value={state.coachId}
                    onChange={(e) => update('coachId', e.target.value)}
                    className={INPUT_CLASS}
                    disabled={submitting || coachOptions.length === 0}
                    required
                >
                    <option value="">— выберите тренера —</option>
                    {coachOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.name}
                        </option>
                    ))}
                </select>
                {coachOptions.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Сначала добавьте активного тренера на /coaches</p>
                )}
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field id="startTime" label="Дата и время">
                    <input
                        id="startTime"
                        type="datetime-local"
                        value={state.startTime}
                        onChange={(e) => update('startTime', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                        required
                    />
                </Field>
                <Field id="durationMinutes" label="Длительность">
                    <select
                        id="durationMinutes"
                        value={state.durationMinutes}
                        onChange={(e) => update('durationMinutes', Number(e.target.value) as TAllowedDuration)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    >
                        {ALLOWED_DURATIONS.map((value) => (
                            <option key={value} value={value}>
                                {value} мин
                            </option>
                        ))}
                    </select>
                </Field>
            </div>

            {onSubmitRecurring && (
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-body">
                        <input
                            type="checkbox"
                            checked={repeat}
                            onChange={(e) => setRepeat(e.target.checked)}
                            disabled={submitting}
                            className="h-4 w-4"
                        />
                        Повторять
                    </label>

                    {repeat && (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Дата и время выше задают начало и время повторяющихся занятий.
                            </p>
                            <RecurrenceFields
                                weekdays={weekdays}
                                onToggleDay={toggleDay}
                                rangeMode={rangeMode}
                                onRangeModeChange={setRangeMode}
                                weeks={weeks}
                                onWeeksChange={setWeeks}
                                toDate={toDate}
                                onToDateChange={setToDate}
                                disabled={submitting}
                            />
                            <p className="text-sm text-body-secondary">
                                Будет создано занятий: {recurringEntries.length}
                            </p>
                        </>
                    )}
                </div>
            )}

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={submitting || (recurringEnabled && recurringEntries.length === 0)}
                    className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting
                        ? 'Сохранение...'
                        : recurringEnabled
                        ? `Создать (${recurringEntries.length})`
                        : submitLabel}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border px-4 py-2 hover:bg-muted"
                    >
                        Отмена
                    </button>
                )}
            </div>
        </form>
    );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-body-secondary">
                {label}
            </label>
            {children}
        </div>
    );
}
