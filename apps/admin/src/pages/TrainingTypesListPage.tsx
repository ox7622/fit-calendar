import { DIFFICULTY_LEVEL_LABELS } from '@fitcalendar/shared';
import { useEffect, useState } from 'react';

import { adminTrainingTypesApi, type IAdminTrainingType, type TDifficulty } from '@/shared/api';
import { ImpactTypeBadge } from '@/shared/components/ImpactTypeBadge';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const DIFFICULTY_LABEL: Record<TDifficulty, string> = DIFFICULTY_LEVEL_LABELS;

const DIFFICULTY_COLOR: Record<TDifficulty, string> = {
    beginner: 'bg-green-500/15 text-green-500',
    intermediate: 'bg-yellow-500/15 text-yellow-500',
    advanced: 'bg-red-500/15 text-red-500',
};

export function TrainingTypesListPage() {
    const [types, setTypes] = useState<IAdminTrainingType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        adminTrainingTypesApi
            .list()
            .then((data) => {
                if (cancelled) return;
                setTypes(data);
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
                        {types.map((type) => (
                            <tr key={type.id} className="border-b border-border hover:bg-muted/20">
                                <td className="p-2">
                                    <Link to={`/training-types/${type.id}`} className="text-body hover:text-primary">
                                        {type.name}
                                    </Link>
                                </td>
                                <td className="p-2">
                                    <span
                                        className={`rounded px-2 py-0.5 text-xs ${DIFFICULTY_COLOR[type.difficulty]}`}
                                    >
                                        {DIFFICULTY_LABEL[type.difficulty]}
                                    </span>
                                </td>
                                <td className="p-2">
                                    <div className="flex flex-wrap gap-1">
                                        {type.impactTypes.map((it) => (
                                            <ImpactTypeBadge key={it} type={it} />
                                        ))}
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
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default TrainingTypesListPage;
