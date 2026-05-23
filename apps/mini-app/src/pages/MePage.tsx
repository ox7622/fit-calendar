import { useEffect, useState } from 'react';

import { MembershipCard } from '@/features/me/MembershipCard';
import { ApiError, meApi, meMembershipApi, type IMembership, type MeResponse } from '@/shared/api';
import { Link } from 'react-router-dom';

export function MePage(): JSX.Element {
    const [me, setMe] = useState<MeResponse | null>(null);
    const [membership, setMembership] = useState<IMembership | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([meApi.get(), meMembershipApi.get().catch(() => ({ membership: null }))])
            .then(([meResp, memResp]) => {
                if (cancelled) return;
                setMe(meResp);
                setMembership(memResp.membership);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err instanceof ApiError ? 'Не удалось загрузить профиль' : 'Не удалось загрузить профиль');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return <p className="p-4 text-body-secondary">Загрузка...</p>;
    if (error) return <p className="p-4 text-destructive">{error}</p>;
    if (!me) return <p className="p-4 text-body-secondary">Нет данных</p>;

    const isLinked = me.linked === true;
    const customer = isLinked ? me.customer : null;

    return (
        <div className="overflow-y-auto h-full p-4 space-y-4">
            <header>
                <h1 className="heading-1">
                    {customer?.firstName ?? 'Профиль'}
                    {customer?.lastName ? ` ${customer.lastName}` : ''}
                </h1>
                {customer?.phone && <p className="text-body-secondary text-sm">{customer.phone}</p>}
            </header>

            {!isLinked && (
                <div className="rounded border border-border bg-card p-4">
                    <p className="text-body-secondary">
                        Привяжите номер телефона на странице расписания, чтобы увидеть свой абонемент.
                    </p>
                </div>
            )}

            {isLinked && membership && <MembershipCard membership={membership} />}

            {isLinked && !membership && (
                <div className="rounded border border-border bg-card p-4 space-y-3">
                    <p className="text-body-secondary">У вас пока нет активного абонемента.</p>
                    <Link
                        to="/plans"
                        className="inline-block rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
                    >
                        Посмотреть планы
                    </Link>
                </div>
            )}

            {isLinked && membership && (
                <div className="text-center">
                    <Link to="/plans" className="text-sm text-primary hover:underline">
                        Все планы клуба
                    </Link>
                </div>
            )}
        </div>
    );
}

export default MePage;
