import { useEffect, useState } from 'react';

import { MembershipCard } from '@/features/me/MembershipCard';
import { ApiError, meApi, meMembershipApi, type IMembership, type MeResponse } from '@/shared/api';
import { Bell, ChevronRight } from 'lucide-react';
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
    const fullName = customer
        ? `${customer.firstName ?? ''}${customer.lastName ? ` ${customer.lastName}` : ''}`.trim()
        : '';
    const initials = fullName
        ? fullName
              .split(' ')
              .map((part) => part[0] ?? '')
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '👤';

    return (
        <div className="overflow-y-auto h-full p-4 space-y-4">
            <header className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-base font-semibold text-primary">
                    {initials}
                </div>
                <div className="min-w-0">
                    <h1 className="heading-1 leading-tight">{fullName || 'Профиль'}</h1>
                    {customer?.phone && <p className="font-mono text-sm text-muted-foreground">{customer.phone}</p>}
                </div>
            </header>

            {!isLinked && (
                <div className="rounded-[14px] border border-border bg-card p-4">
                    <p className="text-body-secondary">
                        Привяжите номер телефона на странице расписания, чтобы увидеть свой абонемент.
                    </p>
                </div>
            )}

            {isLinked && membership && <MembershipCard membership={membership} />}

            {isLinked && !membership && (
                <div className="rounded-[14px] border border-border bg-card p-4 space-y-3">
                    <p className="text-body-secondary">У вас пока нет активного абонемента.</p>
                    <Link
                        to="/plans"
                        className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                        Посмотреть планы
                    </Link>
                </div>
            )}

            {isLinked && membership && (
                <Link
                    to="/plans"
                    className="block w-full rounded-lg border border-border bg-card py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.98]"
                >
                    Все планы клуба
                </Link>
            )}

            {isLinked && (
                <Link
                    to="/reminders"
                    className="flex w-full items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3 transition-colors hover:bg-muted active:scale-[0.99]"
                >
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Bell size={18} />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">Мои напоминания</span>
                    <ChevronRight size={18} className="text-muted-foreground" />
                </Link>
            )}
        </div>
    );
}

export default MePage;
