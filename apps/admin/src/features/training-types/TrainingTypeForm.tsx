import { useState, type FormEvent } from 'react';

import { DIFFICULTY_LEVELS, IMPACT_TYPES, type TDifficulty, type TImpactType } from '@/shared/api';
import { ChipInput } from '@/shared/components/ChipInput';
import { ImpactTypeBadge } from '@/shared/components/ImpactTypeBadge';
import { DIFFICULTY_LEVEL_LABELS } from '@fitcalendar/shared';

export interface ITrainingTypeFormValues {
    name: string;
    description: string;
    difficulty: TDifficulty;
    impactTypes: TImpactType[];
    equipment: string[];
    isActive: boolean;
}

interface ITrainingTypeFormProps {
    initial?: Partial<ITrainingTypeFormValues>;
    submitLabel: string;
    onSubmit: (values: ITrainingTypeFormValues) => Promise<void>;
    onCancel: () => void;
}

const EMPTY_VALUES: ITrainingTypeFormValues = {
    name: '',
    description: '',
    difficulty: 'beginner',
    impactTypes: [],
    equipment: [],
    isActive: true,
};

const DIFFICULTY_LABELS: Record<TDifficulty, string> = DIFFICULTY_LEVEL_LABELS;

export function TrainingTypeForm({ initial, submitLabel, onSubmit, onCancel }: ITrainingTypeFormProps) {
    const [values, setValues] = useState<ITrainingTypeFormValues>({ ...EMPTY_VALUES, ...initial });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleImpact = (type: TImpactType): void => {
        setValues((v) => ({
            ...v,
            impactTypes: v.impactTypes.includes(type)
                ? v.impactTypes.filter((t) => t !== type)
                : [...v.impactTypes, type],
        }));
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);
        if (values.name.trim().length < 2) {
            setError('Название обязательно (минимум 2 символа)');
            return;
        }
        if (values.impactTypes.length === 0) {
            setError('Выберите хотя бы один тип нагрузки');
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit({
                ...values,
                name: values.name.trim(),
                description: values.description.trim(),
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить');
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
            <div>
                <label htmlFor="type-name" className="text-body mb-1 block">
                    Название <span className="text-destructive">*</span>
                </label>
                <input
                    id="type-name"
                    type="text"
                    value={values.name}
                    onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                    disabled={submitting}
                    className="w-full rounded border border-border bg-surface p-2 text-body"
                    maxLength={255}
                    required
                />
            </div>

            <div>
                <label htmlFor="type-description" className="text-body mb-1 block">
                    Описание
                </label>
                <textarea
                    id="type-description"
                    value={values.description}
                    onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                    disabled={submitting}
                    className="w-full rounded border border-border bg-surface p-2 text-body"
                    rows={3}
                    maxLength={2000}
                />
            </div>

            <div>
                <label className="text-body mb-1 block">Уровень сложности</label>
                <div className="inline-flex rounded border border-border bg-surface p-1">
                    {DIFFICULTY_LEVELS.map((level) => (
                        <button
                            key={level}
                            type="button"
                            onClick={() => setValues((v) => ({ ...v, difficulty: level }))}
                            disabled={submitting}
                            className={`rounded px-3 py-1 text-sm transition-colors ${
                                values.difficulty === level
                                    ? 'bg-primary text-white'
                                    : 'text-body-secondary hover:bg-muted/40'
                            }`}
                        >
                            {DIFFICULTY_LABELS[level]}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-body mb-1 block">
                    Типы нагрузки <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {IMPACT_TYPES.map((type) => {
                        const selected = values.impactTypes.includes(type);
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => toggleImpact(type)}
                                disabled={submitting}
                                className={`rounded border px-2 py-1 transition-opacity ${
                                    selected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border opacity-60 hover:opacity-100'
                                }`}
                            >
                                <ImpactTypeBadge type={type} size="md" />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="text-body mb-1 block">Оборудование</label>
                <ChipInput
                    values={values.equipment}
                    onChange={(next) => setValues((v) => ({ ...v, equipment: next }))}
                    placeholder="Например: Коврик, Гантели"
                    maxItems={30}
                    disabled={submitting}
                />
            </div>

            <label className="inline-flex items-center gap-2" title="Неактивные типы скрыты от участников клуба">
                <input
                    type="checkbox"
                    checked={values.isActive}
                    onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
                    disabled={submitting}
                />
                <span className="text-body">Активен</span>
            </label>

            {error && <p className="text-destructive">{error}</p>}

            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                >
                    {submitting ? 'Сохранение...' : submitLabel}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="rounded border border-border px-4 py-2 text-body hover:bg-surface-hover disabled:opacity-50"
                >
                    Отмена
                </button>
            </div>
        </form>
    );
}

export default TrainingTypeForm;
