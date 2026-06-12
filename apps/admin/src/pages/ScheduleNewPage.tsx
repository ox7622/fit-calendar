import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, ApiError } from '@/shared/api';
import { useNavigate } from 'react-router-dom';

export function ScheduleNewPage() {
    const navigate = useNavigate();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новое занятие</h2>
            <ScheduleForm
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    try {
                        await adminScheduleApi.create(payload);
                        navigate('/dashboard', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось создать занятие');
                        }
                        throw err;
                    }
                }}
                onSubmitRecurring={async (entries) => {
                    try {
                        await adminScheduleApi.bulkCreate(entries);
                        navigate('/dashboard', { replace: true });
                    } catch (err) {
                        if (err instanceof ApiError) {
                            const body = err.data as { message?: string } | null;
                            throw new Error(body?.message ?? 'Не удалось создать занятия');
                        }
                        throw err;
                    }
                }}
                onCancel={() => navigate('/dashboard')}
            />
        </div>
    );
}

export default ScheduleNewPage;
