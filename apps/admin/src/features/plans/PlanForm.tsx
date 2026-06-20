import type { FormEvent, KeyboardEvent } from 'react';
import { useState } from 'react';

import type { TDurationUnit, IPlanFormPayload } from '@/shared/api';

const INPUT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

interface IPlanFormProps {
    initialValues?: Partial<IPlanFormPayload>;
    submitLabel: string;
    onSubmit: (payload: IPlanFormPayload) => Promise<void>;
    onCancel?: () => void;
}

interface IPlanFormState {
    name: string;
    durationValue: string;
    durationUnit: TDurationUnit;
    priceRub: string;
    features: string[];
    guestVisitsAllowed: string;
    freezeDaysAllowed: string;
    isActive: boolean;
}

function toState(values?: Partial<IPlanFormPayload>): IPlanFormState {
    return {
        name: values?.name ?? '',
        durationValue: values?.durationValue?.toString() ?? '1',
        durationUnit: values?.durationUnit ?? 'month',
        priceRub: values?.priceRub?.toString() ?? '0',
        features: values?.features ?? [],
        guestVisitsAllowed: values?.guestVisitsAllowed?.toString() ?? '0',
        freezeDaysAllowed: values?.freezeDaysAllowed?.toString() ?? '0',
        isActive: values?.isActive ?? true,
    };
}

export function PlanForm({ initialValues, submitLabel, onSubmit, onCancel }: IPlanFormProps) {
    const [state, setState] = useState<IPlanFormState>(() => toState(initialValues));
    const [chipDraft, setChipDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const update = <K extends keyof IPlanFormState>(key: K, value: IPlanFormState[K]): void => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

    const addChip = (): void => {
        const trimmed = chipDraft.trim();
        if (!trimmed) return;
        if (state.features.includes(trimmed)) {
            setChipDraft('');
            return;
        }
        if (state.features.length >= 20) {
            setError('Не более 20 особенностей');
            return;
        }
        update('features', [...state.features, trimmed]);
        setChipDraft('');
    };

    const removeChip = (chip: string): void => {
        update(
            'features',
            state.features.filter((c) => c !== chip),
        );
    };

    const onChipKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip();
        } else if (e.key === 'Backspace' && !chipDraft && state.features.length > 0) {
            const last = state.features[state.features.length - 1];
            if (last !== undefined) removeChip(last);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (submitting) return;

        setError(null);

        const payload: IPlanFormPayload = {
            name: state.name.trim(),
            durationValue: Number(state.durationValue),
            durationUnit: state.durationUnit,
            priceRub: Number(state.priceRub),
            features: state.features,
            guestVisitsAllowed: Number(state.guestVisitsAllowed),
            freezeDaysAllowed: Number(state.freezeDaysAllowed),
            isActive: state.isActive,
        };

        if (!payload.name) {
            setError('Введите название');
            return;
        }
        if (!Number.isFinite(payload.durationValue) || payload.durationValue < 1) {
            setError('Длительность должна быть ≥ 1');
            return;
        }
        if (!Number.isFinite(payload.priceRub) || payload.priceRub < 0) {
            setError('Цена должна быть ≥ 0');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit(payload);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить план');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl" noValidate>
            <Field id="plan-name" label="Название">
                <input
                    id="plan-name"
                    type="text"
                    value={state.name}
                    onChange={(e) => update('name', e.target.value)}
                    className={INPUT_CLASS}
                    disabled={submitting}
                    required
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field id="plan-duration-value" label="Длительность">
                    <input
                        id="plan-duration-value"
                        type="number"
                        min={1}
                        value={state.durationValue}
                        onChange={(e) => update('durationValue', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    />
                </Field>
                <Field id="plan-duration-unit" label="Единица">
                    <select
                        id="plan-duration-unit"
                        value={state.durationUnit}
                        onChange={(e) => update('durationUnit', e.target.value as TDurationUnit)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    >
                        <option value="day">День</option>
                        <option value="week">Неделя</option>
                        <option value="month">Месяц</option>
                    </select>
                </Field>
            </div>

            <Field id="plan-price" label="Цена (₽)">
                <input
                    id="plan-price"
                    type="number"
                    min={0}
                    value={state.priceRub}
                    onChange={(e) => update('priceRub', e.target.value)}
                    className={INPUT_CLASS}
                    disabled={submitting}
                />
            </Field>

            <Field id="plan-feature-input" label="Особенности">
                <div
                    className="rounded-md border border-input bg-background px-2 py-1.5 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-ring"
                    role="group"
                    aria-label="Особенности"
                >
                    {state.features.map((chip) => (
                        <span
                            key={chip}
                            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-sm"
                        >
                            {chip}
                            <button
                                type="button"
                                onClick={() => removeChip(chip)}
                                aria-label={`Удалить ${chip}`}
                                className="text-primary/70 hover:text-primary"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    <input
                        id="plan-feature-input"
                        type="text"
                        value={chipDraft}
                        onChange={(e) => setChipDraft(e.target.value)}
                        onKeyDown={onChipKeyDown}
                        onBlur={addChip}
                        placeholder={state.features.length === 0 ? 'Enter — добавить' : ''}
                        className="flex-1 min-w-[120px] bg-transparent outline-none text-foreground py-1"
                        disabled={submitting}
                    />
                </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field id="plan-guests" label="Гостевых визитов">
                    <input
                        id="plan-guests"
                        type="number"
                        min={0}
                        max={365}
                        value={state.guestVisitsAllowed}
                        onChange={(e) => update('guestVisitsAllowed', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    />
                </Field>
                <Field id="plan-freeze" label="Дней заморозки">
                    <input
                        id="plan-freeze"
                        type="number"
                        min={0}
                        max={365}
                        value={state.freezeDaysAllowed}
                        onChange={(e) => update('freezeDaysAllowed', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    />
                </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={state.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-input"
                />
                Активный (виден в публичном каталоге)
            </label>

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
