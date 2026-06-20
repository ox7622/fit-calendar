import { useEffect, useState } from 'react';

import { adminCoachesApi, type IAdminCoach } from '@/shared/api';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CoachesListPage() {
    const [coaches, setCoaches] = useState<IAdminCoach[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        adminCoachesApi
            .list()
            .then((data) => {
                if (cancelled) return;
                setCoaches(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить тренеров');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Тренеры</h2>
                <Link
                    to="/coaches/new"
                    className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-white hover:opacity-90"
                >
                    <Plus className="h-4 w-4" /> Добавить
                </Link>
            </div>

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && coaches.length === 0 && (
                <p className="text-body-secondary">Пока никого. Нажмите «Добавить».</p>
            )}

            {!loading && !error && coaches.length > 0 && (
                <table className="w-full border-collapse rounded border border-border bg-surface">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-sm text-body-secondary">
                            <th className="w-16 p-2"></th>
                            <th className="p-2">Имя</th>
                            <th className="p-2">Специализации</th>
                            <th className="w-24 p-2">Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        {coaches.map((coach) => (
                            <tr key={coach.id} className="border-b border-border hover:bg-muted/20">
                                <td className="p-2">
                                    <Link to={`/coaches/${coach.id}`} className="block">
                                        {coach.photoUrl ? (
                                            <img
                                                src={coach.photoUrl}
                                                alt=""
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-muted" />
                                        )}
                                    </Link>
                                </td>
                                <td className="p-2">
                                    <Link to={`/coaches/${coach.id}`} className="text-body hover:text-primary">
                                        {coach.name}
                                    </Link>
                                </td>
                                <td className="p-2 text-body-secondary">
                                    {coach.specializations.length > 0 ? coach.specializations.join(', ') : '—'}
                                </td>
                                <td className="p-2">
                                    {coach.isActive ? (
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

export default CoachesListPage;
