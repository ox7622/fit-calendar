import { confirmNotify } from '@/features/schedule/notify-window';
import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, ApiError } from '@/shared/api';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { useNavigate } from 'react-router-dom';

export function ScheduleNewPage() {
    const navigate = useNavigate();
    const { confirm, dialog } = useConfirm();

    return (
        <div className="p-6">
            <h2 className="heading-2 mb-4">Новое занятие</h2>
            <ScheduleForm
                submitLabel="Создать"
                onSubmit={async (payload) => {
                    const { proceed, notify } = await confirmNotify(confirm, payload.startTime, {
                        title: 'Создать занятие?',
                        confirmLabel: 'Создать',
                    });
                    if (!proceed) return;
                    try {
                        await adminScheduleApi.create(payload, notify);
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
            {dialog}
        </div>
    );
}

export default ScheduleNewPage;
