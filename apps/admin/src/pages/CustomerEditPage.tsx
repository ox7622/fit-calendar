import { useEffect, useState } from 'react';

import { AssignMembershipModal } from '@/features/customers/AssignMembershipModal';
import { CustomerForm } from '@/features/customers/CustomerForm';
import { MembershipHistory } from '@/features/customers/MembershipHistory';
import {
    adminCustomersApi,
    adminMembershipsApi,
    ApiError,
    type IAdminCustomer,
    type IAdminMembership,
} from '@/shared/api';
import { useNavigate, useParams } from 'react-router-dom';

export function CustomerEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [customer, setCustomer] = useState<IAdminCustomer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [memberships, setMemberships] = useState<IAdminMembership[]>([]);
    const [showAssign, setShowAssign] = useState(false);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        Promise.all([adminCustomersApi.getById(id), adminMembershipsApi.listForCustomer(id)])
            .then(([data, mlist]) => {
                if (cancelled) return;
                setCustomer(data);
                setMemberships(mlist);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Клиент не найден');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const onDelete = async (): Promise<void> => {
        if (!id) return;
        if (!window.confirm('Удалить клиента без возможности восстановления?')) return;
        setDeleteError(null);
        try {
            await adminCustomersApi.deleteCustomer(id);
            navigate('/customers', { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                const body = err.data as { message?: unknown } | null;
                setDeleteError(
                    body && typeof body.message === 'string'
                        ? body.message
                        : 'У клиента есть зависимые записи. Удаление невозможно.',
                );
            } else {
                setDeleteError('Не удалось удалить клиента');
            }
        }
    };

    if (loading) {
        return <p className="p-6 text-body-secondary">Загрузка...</p>;
    }
    if (error || !customer) {
        return <p className="p-6 text-destructive">{error ?? 'Клиент не найден'}</p>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Редактирование клиента</h2>
                <button type="button" onClick={onDelete} className="text-sm text-destructive hover:underline">
                    Удалить
                </button>
            </div>

            {deleteError && (
                <p role="alert" className="text-sm text-destructive">
                    {deleteError}
                </p>
            )}

            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="heading-3">Абонементы</h3>
                    <button
                        type="button"
                        onClick={() => setShowAssign(true)}
                        className="rounded border border-border px-3 py-1 text-sm hover:bg-surface-hover"
                    >
                        Назначить план
                    </button>
                </div>
                <MembershipHistory items={memberships} onChange={setMemberships} />
            </section>

            {showAssign && id && (
                <AssignMembershipModal
                    customerId={id}
                    onClose={() => setShowAssign(false)}
                    onAssigned={(created) => setMemberships((prev) => [created, ...prev])}
                />
            )}

            <CustomerForm
                initialValues={customer}
                submitLabel="Сохранить"
                isEditing
                onSubmit={async (payload) => {
                    if (!id) return;
                    try {
                        await adminCustomersApi.update(id, payload);
                        navigate('/customers', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось сохранить клиента');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/customers')}
                onUnlink={async () => {
                    if (!id) return;
                    const updated = await adminCustomersApi.unlink(id);
                    setCustomer(updated);
                }}
            />
        </div>
    );
}

export default CustomerEditPage;
