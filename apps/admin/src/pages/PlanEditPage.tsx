import { useEffect, useState } from 'react';

import { PlanForm } from '@/features/plans/PlanForm';
import { adminPlansApi, ApiError, type IAdminPlan } from '@/shared/api';
import { useNavigate, useParams } from 'react-router-dom';

export function PlanEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [plan, setPlan] = useState<IAdminPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteState, setDeleteState] = useState<'idle' | 'pending' | 'error'>('idle');
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        adminPlansApi
            .getById(id)
            .then((data) => {
                if (!cancelled) {
                    setPlan(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('План не найден');
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const onDelete = async (): Promise<void> => {
        if (!id) return;
        if (!window.confirm('Удалить план без возможности восстановления?')) return;

        setDeleteState('pending');
        setDeleteError(null);
        try {
            await adminPlansApi.deletePlan(id);
            navigate('/plans', { replace: true });
        } catch (err) {
            setDeleteState('error');
            if (err instanceof ApiError && err.status === 409) {
                const body = err.data as { message?: unknown } | null;
                setDeleteError(
                    body && typeof body.message === 'string'
                        ? body.message
                        : 'План не может быть удалён: есть активные подписки.',
                );
            } else {
                setDeleteError('Не удалось удалить план');
            }
        }
    };

    if (loading) {
        return <p className="p-6 text-body-secondary">Загрузка...</p>;
    }
    if (error || !plan) {
        return <p className="p-6 text-destructive">{error ?? 'План не найден'}</p>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Редактирование плана</h2>
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={deleteState === 'pending'}
                    className="text-sm text-destructive hover:underline disabled:opacity-50"
                >
                    Удалить план
                </button>
            </div>

            {deleteError && (
                <p role="alert" className="text-sm text-destructive">
                    {deleteError}
                </p>
            )}

            <PlanForm
                initialValues={plan}
                submitLabel="Сохранить"
                onSubmit={async (payload) => {
                    if (!id) return;
                    await adminPlansApi.update(id, payload);
                    navigate('/plans', { replace: true });
                }}
                onCancel={() => navigate('/plans')}
            />
        </div>
    );
}

export default PlanEditPage;
