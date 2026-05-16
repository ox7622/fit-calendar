// TODO(6.5/6.6): replace the trainingTypeId / coachId text inputs with dropdowns
// populated from /admin/training-types/options and /admin/coaches/options.
// For 6.3 the admin pastes UUIDs from the dashboard list (right-click → copy
// element id from the dev-tools, or query the DB seed directly).
import type { FormEvent } from 'react';
import { useState } from 'react';

import { ALLOWED_DURATIONS, type IScheduleFormPayload, type TAllowedDuration } from '@/shared/api';

const INPUT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

interface IScheduleFormProps {
    initial?: Partial<IScheduleFormPayload>;
    submitLabel: string;
    onSubmit: (payload: IScheduleFormPayload) => Promise<void>;
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

export function ScheduleForm({ initial, submitLabel, onSubmit, onCancel }: IScheduleFormProps): JSX.Element {
    const [state, setState] = useState<IScheduleFormState>(() => toState(initial));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = <K extends keyof IScheduleFormState>(key: K, value: IScheduleFormState[K]): void => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

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

        const payload: IScheduleFormPayload = {
            trainingTypeId: state.trainingTypeId.trim(),
            coachId: state.coachId.trim(),
            // datetime-local has no timezone — interpret as the admin's local TZ
            // and serialize as ISO (UTC). The server stores TIMESTAMP WITH TIME ZONE.
            startTime: new Date(state.startTime).toISOString(),
            durationMinutes: state.durationMinutes,
        };

        setSubmitting(true);
        try {
            await onSubmit(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить занятие');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl" noValidate>
            <Field id="trainingTypeId" label="Тип занятия (UUID)">
                <input
                    id="trainingTypeId"
                    type="text"
                    value={state.trainingTypeId}
                    onChange={(e) => update('trainingTypeId', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="UUID типа занятия"
                    disabled={submitting}
                    required
                />
                <p className="text-xs text-muted-foreground mt-1">Будет заменено выпадающим списком в 6.6</p>
            </Field>

            <Field id="coachId" label="Тренер (UUID)">
                <input
                    id="coachId"
                    type="text"
                    value={state.coachId}
                    onChange={(e) => update('coachId', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="UUID тренера"
                    disabled={submitting}
                    required
                />
                <p className="text-xs text-muted-foreground mt-1">Будет заменено выпадающим списком в 6.5</p>
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

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Сохранение...' : submitLabel}
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
