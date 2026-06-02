import { useEffect, useState } from 'react';

import { CoachForm } from '@/features/coaches/CoachForm';
import { adminCoachesApi, ApiError, type IAdminCoach } from '@/shared/api';
import { useNavigate, useParams } from 'react-router-dom';

export function CoachEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [coach, setCoach] = useState<IAdminCoach | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        adminCoachesApi
            .getById(id)
            .then((data) => {
                if (cancelled) return;
                setCoach(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Тренер не найден');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    const handleDelete = async (): Promise<void> => {
        if (!id) return;
        if (!window.confirm('Удалить тренера? Это нельзя отменить.')) return;
        setDeleteError(null);
        try {
            await adminCoachesApi.deleteCoach(id);
            navigate('/coaches', { replace: true });
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
    if (error || !coach) return <p className="p-6 text-destructive">{error ?? 'Тренер не найден'}</p>;

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="heading-2">Редактирование тренера</h2>
                <button
                    type="button"
                    onClick={handleDelete}
                    className="rounded border border-destructive px-3 py-1 text-destructive hover:bg-destructive/10"
                    title="Доступно только для тренеров без занятий. Иначе используйте деактивацию."
                >
                    Удалить
                </button>
            </div>

            {deleteError && <p className="mb-3 text-destructive">{deleteError}</p>}

            <CoachForm
                initial={{
                    name: coach.name,
                    bio: coach.bio ?? '',
                    specializations: coach.specializations,
                    certifications: coach.certifications,
                    isActive: coach.isActive,
                }}
                photoUrl={coach.photoUrl}
                onPhotoUpload={(file) => adminCoachesApi.uploadPhoto(coach.id, file)}
                submitLabel="Сохранить"
                onSubmit={async (values) => {
                    try {
                        const updated = await adminCoachesApi.update(coach.id, {
                            name: values.name,
                            bio: values.bio || undefined,
                            specializations: values.specializations,
                            certifications: values.certifications,
                            isActive: values.isActive,
                        });
                        setCoach(updated);
                        navigate('/coaches', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось сохранить');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/coaches')}
            />
        </div>
    );
}

export default CoachEditPage;
