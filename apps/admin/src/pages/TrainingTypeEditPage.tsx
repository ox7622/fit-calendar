import { useEffect, useState } from 'react';

import { TrainingTypeForm } from '@/features/training-types/TrainingTypeForm';
import { adminTrainingTypesApi, ApiError, type IAdminTrainingType } from '@/shared/api';
import { useNavigate, useParams } from 'react-router-dom';

export function TrainingTypeEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [type, setType] = useState<IAdminTrainingType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        adminTrainingTypesApi
            .getById(id)
            .then((data) => {
                if (cancelled) return;
                setType(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Тип не найден');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleDelete = async (): Promise<void> => {
        if (!id) return;
        if (!window.confirm('Удалить тип занятия? Это нельзя отменить.')) return;
        setDeleteError(null);
        try {
            await adminTrainingTypesApi.deleteType(id);
            navigate('/training-types', { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setDeleteError(body?.message ?? 'Не удалось удалить');
                return;
            }
            setDeleteError('Не удалось удалить');
        }
    };

    if (loading) return <p className="p-6 text-body-secondary">Загрузка...</p>;
    if (error || !type) return <p className="p-6 text-destructive">{error ?? 'Тип не найден'}</p>;

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="heading-2">Редактирование типа</h2>
                <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded border border-destructive px-3 py-1 text-destructive hover:bg-destructive/10"
                    title="Доступно только для типов без занятий. Иначе используйте деактивацию."
                >
                    Удалить
                </button>
            </div>

            {deleteError && <p className="mb-3 text-destructive">{deleteError}</p>}

            <TrainingTypeForm
                initial={{
                    name: type.name,
                    description: type.description ?? '',
                    difficulty: type.difficulty,
                    impactTypes: type.impactTypes,
                    equipment: type.equipment,
                    isActive: type.isActive,
                }}
                submitLabel="Сохранить"
                onSubmit={async (values) => {
                    try {
                        await adminTrainingTypesApi.update(type.id, {
                            name: values.name,
                            description: values.description || undefined,
                            difficulty: values.difficulty,
                            impactTypes: values.impactTypes,
                            equipment: values.equipment,
                            isActive: values.isActive,
                        });
                        navigate('/training-types', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось сохранить');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/training-types')}
            />
        </div>
    );
}

export default TrainingTypeEditPage;
