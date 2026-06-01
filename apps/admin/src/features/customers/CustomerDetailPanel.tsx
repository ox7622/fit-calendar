import {
    adminCustomersApi,
    adminMembershipsApi,
    ApiError,
    type IAdminCustomer,
    type IAdminMembership,
} from '@/shared/api';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { AssignMembershipModal } from './AssignMembershipModal';
import { FreezePanel } from './FreezePanel';
import { GuestVisitsPanel } from './GuestVisitsPanel';
import { MembershipHistory } from './MembershipHistory';

interface ICustomerDetailPanelProps {
    customerId: string;
    /** Notifies the list to refresh (status / membership changes affect the row). */
    onChanged?: () => void;
}

function getInitials(first: string, last?: string | null): string {
    return `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '—';
}

function fmtShort(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${(y ?? '').slice(2)}`;
}

export function CustomerDetailPanel({ customerId, onChanged }: ICustomerDetailPanelProps): JSX.Element {
    const [customer, setCustomer] = useState<IAdminCustomer | null>(null);
    const [memberships, setMemberships] = useState<IAdminMembership[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAssign, setShowAssign] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        Promise.all([adminCustomersApi.getById(customerId), adminMembershipsApi.listForCustomer(customerId)])
            .then(([c, m]) => {
                if (cancelled) return;
                setCustomer(c);
                setMemberships(m);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Не удалось загрузить клиента');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [customerId]);

    const active = memberships.find((m) => m.status === 'active') ?? null;

    const replaceMembership = (next: IAdminMembership): void => {
        setMemberships((prev) => prev.map((m) => (m.id === next.id ? next : m)));
    };

    const onCancelMembership = async (): Promise<void> => {
        if (!active || cancelling) return;
        if (!window.confirm('Отменить текущий абонемент клиента?')) return;
        setCancelling(true);
        try {
            const updated = await adminMembershipsApi.cancel(active.id);
            replaceMembership(updated);
            onChanged?.();
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось отменить абонемент' : 'Не удалось отменить абонемент');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-body-secondary">Загрузка...</div>;
    }
    if (error || !customer) {
        return <div className="p-6 text-destructive">{error ?? 'Клиент не найден'}</div>;
    }

    return (
        <div className="flex h-full flex-col gap-5 overflow-y-auto p-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-base font-semibold text-primary">
                    {getInitials(customer.firstName, customer.lastName)}
                </span>
                <div className="min-w-0 flex-1">
                    <h3 className="heading-3 truncate">
                        {customer.firstName} {customer.lastName ?? ''}
                    </h3>
                    <p className="font-mono text-sm text-muted-foreground">{customer.phone}</p>
                </div>
                <Link
                    to={`/customers/${customer.id}`}
                    className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <Pencil size={13} />
                    Профиль
                </Link>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
                {customer.telegramId ? (
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        Telegram привязан
                    </span>
                ) : (
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">Без Telegram</span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                        className={`h-2 w-2 rounded-full ${
                            customer.isActive ? 'bg-success' : 'bg-muted-foreground/50'
                        }`}
                    />
                    {customer.isActive ? 'Активен' : 'Неактивен'}
                </span>
            </div>

            {/* Current membership */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Текущий абонемент
                </p>

                {active ? (
                    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="font-semibold text-foreground">{active.plan.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Действует до <span className="font-mono">{fmtShort(active.endDate)}</span>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onCancelMembership}
                                disabled={cancelling}
                                className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
                            >
                                Отменить
                            </button>
                        </div>

                        {/* Counters */}
                        {(active.plan.guestVisitsAllowed > 0 || active.plan.freezeDaysAllowed > 0) && (
                            <div className="grid grid-cols-2 gap-2">
                                {active.plan.guestVisitsAllowed > 0 && (
                                    <div className="rounded-lg bg-muted/60 p-3">
                                        <div className="text-2xl font-bold leading-none text-foreground">
                                            {active.guestVisitsRemaining}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">гостевых</div>
                                    </div>
                                )}
                                {active.plan.freezeDaysAllowed > 0 && (
                                    <div className="rounded-lg bg-muted/60 p-3">
                                        <div className="text-2xl font-bold leading-none text-foreground">
                                            {active.freezeDaysRemaining}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">дн. заморозки</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions (guest visit + freeze panels carry their own dialogs) */}
                        <GuestVisitsPanel
                            membership={active}
                            onRemainingChange={(next) => replaceMembership({ ...active, guestVisitsRemaining: next })}
                        />
                        <FreezePanel membership={active} onMembershipChange={replaceMembership} />
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                        <p className="mb-3 text-sm text-muted-foreground">Активного абонемента нет.</p>
                        <button
                            type="button"
                            onClick={() => setShowAssign(true)}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent-active"
                        >
                            Назначить абонемент
                        </button>
                    </div>
                )}
            </div>

            {/* History */}
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">История</p>
                <MembershipHistory items={memberships} onChange={setMemberships} />
            </div>

            {showAssign && (
                <AssignMembershipModal
                    customerId={customer.id}
                    onClose={() => setShowAssign(false)}
                    onAssigned={(created) => {
                        setMemberships((prev) => [created, ...prev]);
                        onChanged?.();
                    }}
                />
            )}
        </div>
    );
}

export default CustomerDetailPanel;
