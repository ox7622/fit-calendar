import { useState } from 'react';

import {
    adminDifficultyLevelsApi,
    adminDurationOptionsApi,
    adminImpactTypesApi,
    ApiError,
    DURATION_OPTION_MAX_MINUTES,
    DURATION_OPTION_MIN_MINUTES,
    type IDurationOption,
    type ITaxonomyItem,
} from '@/shared/api';
import { TAXONOMY_COLOR_SWATCH, TaxonomyBadge } from '@/shared/components/TaxonomyBadge';
import { useCrudList } from '@/shared/hooks/useCrudList';
import { TAXONOMY_COLORS, type TTaxonomyColor } from '@fitcalendar/shared';
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';

type TTaxonomyApi = typeof adminDifficultyLevelsApi;

function ColorPicker({
    value,
    onChange,
    disabled,
}: {
    value: TTaxonomyColor;
    onChange: (color: TTaxonomyColor) => void;
    disabled?: boolean;
}): JSX.Element {
    return (
        <div className="flex flex-wrap gap-1.5">
            {TAXONOMY_COLORS.map((color) => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onChange(color)}
                    disabled={disabled}
                    aria-label={color}
                    title={color}
                    className={`h-6 w-6 rounded-full ${TAXONOMY_COLOR_SWATCH[color]} ${
                        value === color ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'opacity-70'
                    } disabled:cursor-not-allowed`}
                />
            ))}
        </div>
    );
}

function TaxonomySection({ title, api, addPlaceholder }: { title: string; api: TTaxonomyApi; addPlaceholder: string }) {
    const {
        items,
        loading,
        error,
        actionError,
        busy,
        setActionError,
        reload,
        guard,
        handleMove,
        toggleActive,
        handleDelete,
    } = useCrudList<ITaxonomyItem>(api, {
        confirmDelete: (item) => `Удалить «${item.label}»?`,
        on409: (item) => `«${item.label}» используется типами занятий — сначала отвяжите его там.`,
    });

    // Add-form state.
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState<TTaxonomyColor>('teal');

    // Inline-edit state.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState<TTaxonomyColor>('teal');

    const handleAdd = (): Promise<void> =>
        guard(async () => {
            const label = newLabel.trim();
            if (!label) return;
            try {
                await api.create({ label, color: newColor });
                setNewLabel('');
                reload();
            } catch (err) {
                setActionError(err instanceof ApiError ? 'Не удалось добавить (проверьте название)' : 'Ошибка сети');
            }
        });

    const startEdit = (item: ITaxonomyItem): void => {
        setActionError(null);
        setEditingId(item.id);
        setEditLabel(item.label);
        setEditColor(item.color);
    };

    const saveEdit = (id: string): Promise<void> =>
        guard(async () => {
            const label = editLabel.trim();
            if (!label) return;
            try {
                await api.update(id, { label, color: editColor });
                setEditingId(null);
                reload();
            } catch {
                setActionError('Не удалось сохранить изменения');
            }
        });

    return (
        <section className="space-y-3">
            <h3 className="heading-3">{title}</h3>

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && (
                <ul className="divide-y divide-border overflow-hidden rounded border border-border bg-surface">
                    {items.map((item, index) => {
                        const isEditing = editingId === item.id;
                        return (
                            <li key={item.id} className="flex items-center gap-3 p-2">
                                {/* Reorder. */}
                                <div className="flex flex-col">
                                    <button
                                        type="button"
                                        onClick={() => handleMove(item.id, 'up')}
                                        disabled={busy || index === 0}
                                        aria-label="Выше"
                                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                    >
                                        <ChevronUp size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMove(item.id, 'down')}
                                        disabled={busy || index === items.length - 1}
                                        aria-label="Ниже"
                                        className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                    >
                                        <ChevronDown size={16} />
                                    </button>
                                </div>

                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.target.value)}
                                            disabled={busy}
                                            maxLength={100}
                                            className="flex-1 rounded border border-border bg-background p-1.5 text-body"
                                        />
                                        <ColorPicker value={editColor} onChange={setEditColor} disabled={busy} />
                                        <button
                                            type="button"
                                            onClick={() => saveEdit(item.id)}
                                            disabled={busy}
                                            aria-label="Сохранить"
                                            className="rounded p-1.5 text-primary hover:bg-muted disabled:opacity-50"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            disabled={busy}
                                            aria-label="Отмена"
                                            className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <TaxonomyBadge label={item.label} color={item.color} muted={!item.isActive} />
                                        <code className="text-xs text-muted-foreground">{item.key}</code>
                                        <div className="flex-1" />
                                        <button
                                            type="button"
                                            onClick={() => toggleActive(item)}
                                            disabled={busy}
                                            className="rounded px-2 py-0.5 text-xs text-body-secondary hover:bg-muted disabled:opacity-50"
                                            title="Неактивные скрыты от участников клуба"
                                        >
                                            {item.isActive ? 'Активен' : 'Скрыт'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startEdit(item)}
                                            disabled={busy}
                                            aria-label="Редактировать"
                                            className="rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item)}
                                            disabled={busy}
                                            aria-label="Удалить"
                                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </li>
                        );
                    })}

                    {items.length === 0 && <li className="p-2 text-body-secondary">Пусто. Добавьте первый ниже.</li>}
                </ul>
            )}

            {actionError && <p className="text-destructive">{actionError}</p>}

            {/* Add row. */}
            <div className="flex flex-wrap items-center gap-2 rounded border border-dashed border-border p-2">
                <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd();
                    }}
                    disabled={busy}
                    maxLength={100}
                    placeholder={addPlaceholder}
                    className="flex-1 rounded border border-border bg-background p-1.5 text-body"
                />
                <ColorPicker value={newColor} onChange={setNewColor} disabled={busy} />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={busy || !newLabel.trim()}
                    className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                    <Plus size={16} /> Добавить
                </button>
            </div>
        </section>
    );
}

function DurationSection(): JSX.Element {
    const {
        items,
        loading,
        error,
        actionError,
        busy,
        setActionError,
        reload,
        guard,
        handleMove,
        toggleActive,
        handleDelete,
    } = useCrudList<IDurationOption>(adminDurationOptionsApi, {
        confirmDelete: (item) => `Удалить «${item.valueMinutes} мин»? Существующие занятия не изменятся.`,
    });

    const [newValue, setNewValue] = useState('');

    const handleAdd = (): Promise<void> =>
        guard(async () => {
            const value = Number(newValue);
            if (
                !Number.isInteger(value) ||
                value < DURATION_OPTION_MIN_MINUTES ||
                value > DURATION_OPTION_MAX_MINUTES
            ) {
                setActionError(
                    `Введите целое число от ${DURATION_OPTION_MIN_MINUTES} до ${DURATION_OPTION_MAX_MINUTES}`,
                );
                return;
            }
            try {
                await adminDurationOptionsApi.create({ valueMinutes: value });
                setNewValue('');
                reload();
            } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                    setActionError(`Длительность ${value} мин уже добавлена`);
                } else {
                    setActionError('Не удалось добавить');
                }
            }
        });

    return (
        <section className="space-y-3">
            <h3 className="heading-3">Длительности</h3>

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && (
                <ul className="divide-y divide-border overflow-hidden rounded border border-border bg-surface">
                    {items.map((item, index) => (
                        <li key={item.id} className="flex items-center gap-3 p-2">
                            <div className="flex flex-col">
                                <button
                                    type="button"
                                    onClick={() => handleMove(item.id, 'up')}
                                    disabled={busy || index === 0}
                                    aria-label="Выше"
                                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMove(item.id, 'down')}
                                    disabled={busy || index === items.length - 1}
                                    aria-label="Ниже"
                                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                >
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                            <span
                                className={`font-medium ${item.isActive ? '' : 'text-muted-foreground line-through'}`}
                            >
                                {item.valueMinutes} мин
                            </span>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={() => toggleActive(item)}
                                disabled={busy}
                                className="rounded px-2 py-0.5 text-xs text-body-secondary hover:bg-muted disabled:opacity-50"
                                title="Неактивные скрыты из формы создания занятий"
                            >
                                {item.isActive ? 'Активна' : 'Скрыта'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                disabled={busy}
                                aria-label="Удалить"
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </li>
                    ))}
                    {items.length === 0 && <li className="p-2 text-body-secondary">Пусто. Добавьте первую ниже.</li>}
                </ul>
            )}

            {actionError && <p className="text-destructive">{actionError}</p>}

            <div className="flex items-center gap-2 rounded border border-dashed border-border p-2">
                <input
                    type="number"
                    inputMode="numeric"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAdd();
                    }}
                    disabled={busy}
                    min={DURATION_OPTION_MIN_MINUTES}
                    max={DURATION_OPTION_MAX_MINUTES}
                    placeholder={`Например: 75 (${DURATION_OPTION_MIN_MINUTES}–${DURATION_OPTION_MAX_MINUTES})`}
                    className="flex-1 rounded border border-border bg-background p-1.5 text-body"
                />
                <span className="text-body-secondary">мин</span>
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={busy || !newValue.trim()}
                    className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                    <Plus size={16} /> Добавить
                </button>
            </div>
        </section>
    );
}

export function TaxonomyPage(): JSX.Element {
    return (
        <div className="max-w-3xl space-y-8 p-6">
            <div>
                <h2 className="heading-2">Настройки занятий</h2>
                <p className="text-body-secondary">
                    Длительности, уровни сложности и типы нагрузки, доступные при создании занятий. Порядок задаёт, как
                    они отображаются участникам.
                </p>
            </div>

            <DurationSection />
            <TaxonomySection
                title="Уровни сложности"
                api={adminDifficultyLevelsApi}
                addPlaceholder="Например: Начальный"
            />
            <TaxonomySection title="Типы нагрузки" api={adminImpactTypesApi} addPlaceholder="Например: Кардио" />
        </div>
    );
}

export default TaxonomyPage;
