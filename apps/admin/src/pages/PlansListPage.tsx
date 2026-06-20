import { useEffect, useState } from 'react';

import { adminPlansApi, type IAdminPlan, type TDurationUnit } from '@/shared/api';
import { Link } from 'react-router-dom';

const UNIT_LABELS: Record<TDurationUnit, string> = {
    day: 'дн.',
    week: 'нед.',
    month: 'мес.',
};

function formatPriceRub(rubles: number): string {
    const NBSP = ' ';
    return `${rubles.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}₽`;
}

export function PlansListPage() {
    const [plans, setPlans] = useState<IAdminPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        adminPlansApi
            .list()
            .then((data) => {
                if (!cancelled) {
                    setPlans(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить планы');
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="heading-2">Абонементы</h2>
                <Link
                    to="/plans/new"
                    className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active"
                >
                    Добавить план
                </Link>
            </div>

            {loading ? (
                <p className="text-body-secondary">Загрузка...</p>
            ) : error ? (
                <p className="text-destructive">{error}</p>
            ) : plans.length === 0 ? (
                <p className="text-body-secondary">Планов пока нет.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-left">
                            <tr>
                                <th className="px-4 py-2">Название</th>
                                <th className="px-4 py-2">Длительность</th>
                                <th className="px-4 py-2">Цена</th>
                                <th className="px-4 py-2">Статус</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {plans.map((plan) => (
                                <tr key={plan.id}>
                                    <td className="px-4 py-2 font-medium">{plan.name}</td>
                                    <td className="px-4 py-2">
                                        {plan.durationValue} {UNIT_LABELS[plan.durationUnit]}
                                    </td>
                                    <td className="px-4 py-2">{formatPriceRub(plan.priceRub)}</td>
                                    <td className="px-4 py-2">
                                        {plan.isActive ? (
                                            <span className="text-primary">Активный</span>
                                        ) : (
                                            <span className="text-muted-foreground">Неактивный</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <Link to={`/plans/${plan.id}`} className="text-primary hover:underline">
                                            Изменить
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default PlansListPage;
