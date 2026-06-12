import { useEffect, useMemo, useState } from 'react';

import {
    adminDifficultyLevelsApi,
    adminImpactTypesApi,
    adminTrainingTypesApi,
    type IAdminTrainingType,
    type ITaxonomyItem,
} from '@/shared/api';
import { TaxonomyBadge } from '@/shared/components/TaxonomyBadge';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

function toMap(items: ITaxonomyItem[]): Record<string, ITaxonomyItem> {
    return Object.fromEntries(items.map((item) => [item.key, item]));
}

export function TrainingTypesListPage() {
    const [types, setTypes] = useState<IAdminTrainingType[]>([]);
    const [difficultyItems, setDifficultyItems] = useState<ITaxonomyItem[]>([]);
    const [impactItems, setImpactItems] = useState<ITaxonomyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([adminTrainingTypesApi.list(), adminDifficultyLevelsApi.list(), adminImpactTypesApi.list()])
            .then(([typeRows, difficulty, impact]) => {
                if (cancelled) return;
                setTypes(typeRows);
                setDifficultyItems(difficulty);
                setImpactItems(impact);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить типы занятий');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const difficultyMap = useMemo(() => toMap(difficultyItems), [difficultyItems]);
    const impactMap = useMemo(() => toMap(impactItems), [impactItems]);

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Типы занятий</h2>
                <Link
                    to="/training-types/new"
                    className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-white hover:opacity-90"
                >
                    <Plus className="h-4 w-4" /> Добавить
                </Link>
            </div>

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && types.length === 0 && (
                <p className="text-body-secondary">Пока ничего. Нажмите «Добавить».</p>
            )}

            {!loading && !error && types.length > 0 && (
                <table className="w-full border-collapse rounded border border-border bg-surface">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-sm text-body-secondary">
                            <th className="p-2">Название</th>
                            <th className="p-2">Сложность</th>
                            <th className="p-2">Нагрузка</th>
                            <th className="w-24 p-2">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {types.map((type) => {
                            const difficulty = difficultyMap[type.difficulty];
                            return (
                                <tr key={type.id} className="border-b border-border hover:bg-muted/20">
                                    <td className="p-2">
                                        <Link
                                            to={`/training-types/${type.id}`}
                                            className="text-body hover:text-primary"
                                        >
                                            {type.name}
                                        </Link>
                                    </td>
                                    <td className="p-2">
                                        <TaxonomyBadge
                                            label={difficulty?.label ?? type.difficulty}
                                            color={difficulty?.color ?? 'slate'}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <div className="flex flex-wrap gap-1">
                                            {type.impactTypes.map((key) => {
                                                const impact = impactMap[key];
                                                return (
                                                    <TaxonomyBadge
                                                        key={key}
                                                        label={impact?.label ?? key}
                                                        color={impact?.color ?? 'slate'}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        {type.isActive ? (
                                            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                                                Активен
                                            </span>
                                        ) : (
                                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-body-secondary">
                                                Скрыт
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TrainingTypesListPage;
