import { useEffect, useState } from 'react';

import {
    adminDifficultyLevelsApi,
    adminImpactTypesApi,
    ApiError,
    type ITaxonomyItem,
    type TTaxonomyMoveDirection,
} from '@/shared/api';
import { TAXONOMY_COLOR_SWATCH, TaxonomyBadge } from '@/shared/components/TaxonomyBadge';
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
    const [items, setItems] = useState<ITaxonomyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    // Add-form state.
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState<TTaxonomyColor>('teal');

    // Inline-edit state.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const [editColor, setEditColor] = useState<TTaxonomyColor>('teal');

    const reload = (): void => {
        setLoading(true);
        api.list()
            .then((data) => {
                setItems(data);
                setError(null);
            })
            .catch(() => setError('Не удалось загрузить список'))
            .finally(() => setLoading(false));
    };

    useEffect(reload, []); // eslint-disable-line react-hooks/exhaustive-deps

    const guard = async (fn: () => Promise<void>): Promise<void> => {
        if (busy) return;
        setActionError(null);
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    };

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

    const handleMove = (id: string, direction: TTaxonomyMoveDirection): Promise<void> =>
        guard(async () => {
            try {
                const next = await api.move(id, direction);
                setItems(next);
            } catch {
                setActionError('Не удалось изменить порядок');
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

    const toggleActive = (item: ITaxonomyItem): Promise<void> =>
        guard(async () => {
            try {
                await api.update(item.id, { isActive: !item.isActive });
                reload();
            } catch {
                setActionError('Не удалось изменить статус');
            }
        });

    const handleDelete = (item: ITaxonomyItem): Promise<void> =>
        guard(async () => {
            if (!window.confirm(`Удалить «${item.label}»?`)) return;
            try {
                await api.remove(item.id);
                reload();
            } catch (err) {
                if (err instanceof ApiError && err.status === 409) {
                    setActionError(`«${item.label}» используется типами занятий — сначала отвяжите его там.`);
                } else {
                    setActionError('Не удалось удалить');
                }
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

export function TaxonomyPage(): JSX.Element {
    return (
        <div className="max-w-3xl space-y-8 p-6">
            <div>
                <h2 className="heading-2">Сложность и нагрузка</h2>
                <p className="text-body-secondary">
                    Уровни сложности и типы нагрузки, доступные при настройке типов занятий. Порядок задаёт, как они
                    отображаются участникам.
                </p>
            </div>

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
