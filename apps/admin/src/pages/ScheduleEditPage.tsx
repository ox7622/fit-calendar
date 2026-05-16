import { useEffect, useState } from 'react';

import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, ApiError, type IAdminScheduleItem } from '@/shared/api';
import { useNavigate, useParams } from 'react-router-dom';

export function ScheduleEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [entry, setEntry] = useState<IAdminScheduleItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        adminScheduleApi
            .getById(id)
            .then((data) => {
                if (cancelled) return;
                setEntry(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setError('Занятие не найдено');
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <p className="p-6 text-body-secondary">Загрузка...</p>;
    }
    if (error || !entry) {
        return <p className="p-6 text-destructive">{error ?? 'Занятие не найдено'}</p>;
    }

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Редактирование занятия</h2>
            <ScheduleForm
                initial={{
                    trainingTypeId: entry.trainingType.id,
                    coachId: entry.coach.id,
                    startTime: entry.startTime,
                    durationMinutes: entry.durationMinutes,
                }}
                submitLabel="Сохранить"
                onSubmit={async (payload) => {
                    if (!id) return;
                    try {
                        await adminScheduleApi.update(id, payload);
                        navigate('/dashboard', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось сохранить занятие');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/dashboard')}
            />
        </div>
    );
}

export default ScheduleEditPage;
