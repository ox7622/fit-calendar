import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { adminDifficultyLevelsApi, adminImpactTypesApi, type ITaxonomyItem } from '@/shared/api';
import { ChipInput } from '@/shared/components/ChipInput';
import { TaxonomyBadge } from '@/shared/components/TaxonomyBadge';

export interface ITrainingTypeFormValues {
    name: string;
    description: string;
    difficulty: string;
    impactTypes: string[];
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
    difficulty: '',
    impactTypes: [],
    equipment: [],
    isActive: true,
};

/** Active items, plus any already-selected-but-now-inactive ones so editing an
 *  existing type never silently drops a value the admin can't see. */
function withSelected(items: ITaxonomyItem[], selectedKeys: string[]): ITaxonomyItem[] {
    return items.filter((item) => item.isActive || selectedKeys.includes(item.key));
}

export function TrainingTypeForm({ initial, submitLabel, onSubmit, onCancel }: ITrainingTypeFormProps) {
    const [values, setValues] = useState<ITrainingTypeFormValues>({ ...EMPTY_VALUES, ...initial });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [difficultyItems, setDifficultyItems] = useState<ITaxonomyItem[]>([]);
    const [impactItems, setImpactItems] = useState<ITaxonomyItem[]>([]);
    const [taxonomyLoading, setTaxonomyLoading] = useState(true);
    const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([adminDifficultyLevelsApi.list(), adminImpactTypesApi.list()])
            .then(([difficulty, impact]) => {
                if (cancelled) return;
                setDifficultyItems(difficulty);
                setImpactItems(impact);
                // Creating (no preset difficulty): default to the first active level.
                setValues((v) => {
                    if (v.difficulty) return v;
                    const firstActive = difficulty.find((d) => d.isActive);
                    return firstActive ? { ...v, difficulty: firstActive.key } : v;
                });
            })
            .catch(() => {
                if (cancelled) return;
                setTaxonomyError('Не удалось загрузить уровни сложности и типы нагрузки');
            })
            .finally(() => {
                if (!cancelled) setTaxonomyLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const difficultyChoices = useMemo(
        () => withSelected(difficultyItems, [values.difficulty]),
        [difficultyItems, values.difficulty],
    );
    const impactChoices = useMemo(
        () => withSelected(impactItems, values.impactTypes),
        [impactItems, values.impactTypes],
    );

    const toggleImpact = (key: string): void => {
        setValues((v) => ({
            ...v,
            impactTypes: v.impactTypes.includes(key) ? v.impactTypes.filter((t) => t !== key) : [...v.impactTypes, key],
        }));
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);
        if (values.name.trim().length < 2) {
            setError('Название обязательно (минимум 2 символа)');
            return;
        }
        if (!values.difficulty) {
            setError('Выберите уровень сложности');
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

            {taxonomyError && <p className="text-destructive">{taxonomyError}</p>}

            <div>
                <label className="text-body mb-1 block">
                    Уровень сложности <span className="text-destructive">*</span>
                </label>
                {taxonomyLoading ? (
                    <p className="text-body-secondary">Загрузка...</p>
                ) : difficultyChoices.length === 0 ? (
                    <p className="text-body-secondary">
                        Нет уровней сложности — добавьте их на странице «Сложность и нагрузка».
                    </p>
                ) : (
                    <div className="inline-flex flex-wrap gap-1 rounded border border-border bg-surface p-1">
                        {difficultyChoices.map((level) => (
                            <button
                                key={level.key}
                                type="button"
                                onClick={() => setValues((v) => ({ ...v, difficulty: level.key }))}
                                disabled={submitting}
                                className={`rounded px-3 py-1 text-sm transition-colors ${
                                    values.difficulty === level.key
                                        ? 'bg-primary text-white'
                                        : 'text-body-secondary hover:bg-muted/40'
                                }`}
                            >
                                {level.label}
                                {!level.isActive && ' (скрыт)'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className="text-body mb-1 block">
                    Типы нагрузки <span className="text-destructive">*</span>
                </label>
                {taxonomyLoading ? (
                    <p className="text-body-secondary">Загрузка...</p>
                ) : impactChoices.length === 0 ? (
                    <p className="text-body-secondary">
                        Нет типов нагрузки — добавьте их на странице «Сложность и нагрузка».
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {impactChoices.map((type) => {
                            const selected = values.impactTypes.includes(type.key);
                            return (
                                <button
                                    key={type.key}
                                    type="button"
                                    onClick={() => toggleImpact(type.key)}
                                    disabled={submitting}
                                    className={`rounded border px-2 py-1 transition-opacity ${
                                        selected
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <TaxonomyBadge
                                        label={`${type.label}${type.isActive ? '' : ' (скрыт)'}`}
                                        color={type.color}
                                    />
                                </button>
                            );
                        })}
                    </div>
                )}
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
