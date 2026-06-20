import { useEffect, useState } from 'react';

import { DuplicateClassDialog } from '@/features/schedule/bulk/DuplicateClassDialog';
import { CancelClassModal } from '@/features/schedule/CancelClassModal';
import { confirmNotify, isWithinNotifyWindow, PUSH_WARNING } from '@/features/schedule/notify-window';
import { ScheduleForm } from '@/features/schedule/ScheduleForm';
import { adminScheduleApi, ApiError, type IAdminScheduleItem } from '@/shared/api';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { useNavigate, useParams } from 'react-router-dom';

export function ScheduleEditPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [entry, setEntry] = useState<IAdminScheduleItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [dupOpen, setDupOpen] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const { confirm, dialog: confirmDialog } = useConfirm();

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

    const isCancelled = entry.status === 'cancelled';
    const startLabel = new Date(entry.startTime).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleDelete = async () => {
        if (!id || !entry) return;
        const willPush = isWithinNotifyWindow(entry.startTime);
        const prefix = willPush ? `${PUSH_WARNING} ` : '';
        const { confirmed, notify } = await confirm({
            title: 'Удалить занятие?',
            message: `${prefix}Занятие будет удалено безвозвратно. Продолжить?`,
            confirmLabel: 'Удалить',
            danger: true,
            notifyToggle: willPush,
        });
        if (!confirmed) return;
        setDeleteError(null);
        try {
            await adminScheduleApi.delete(id, notify);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setDeleteError(body?.message ?? 'Не удалось удалить занятие');
                return;
            }
            setDeleteError('Не удалось удалить занятие');
        }
    };

    return (
        <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="heading-2">Редактирование занятия</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setDupOpen(true)}
                        className="rounded border border-border px-3 py-1 text-body hover:bg-surface-hover"
                    >
                        Копировать
                    </button>
                    {!isCancelled && (
                        <button
                            type="button"
                            onClick={() => setShowCancelModal(true)}
                            className="rounded border border-destructive px-3 py-1 text-destructive hover:bg-destructive/10"
                        >
                            Отменить занятие
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="rounded border border-border px-3 py-1 text-body hover:bg-surface-hover"
                        title="Удаление занятия в ближайшие 5 дней отправит пуш всем пользователям бота."
                    >
                        Удалить
                    </button>
                </div>
            </div>

            {isCancelled && (
                <div className="mb-4 rounded border border-destructive/50 bg-destructive/10 p-3">
                    <p className="text-destructive">
                        Занятие отменено{entry.cancellationReason ? `: ${entry.cancellationReason}` : ''}
                    </p>
                </div>
            )}
            {deleteError && <p className="text-destructive mb-3">{deleteError}</p>}

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
                    const { proceed, notify } = await confirmNotify(confirm, payload.startTime, {
                        title: 'Сохранить изменения?',
                        confirmLabel: 'Сохранить',
                    });
                    if (!proceed) return;
                    try {
                        await adminScheduleApi.update(id, payload, notify);
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

            {showCancelModal && (
                <CancelClassModal
                    className={entry.trainingType.name}
                    startTimeLabel={startLabel}
                    willPush={isWithinNotifyWindow(entry.startTime)}
                    onConfirm={async (reason, notify) => {
                        if (!id) return;
                        try {
                            const updated = await adminScheduleApi.cancel(id, reason, notify);
                            setEntry(updated);
                        } catch (err) {
                            if (err instanceof ApiError) {
                                const body = err.data as { message?: string } | null;
                                throw new Error(body?.message ?? 'Не удалось отменить занятие');
                            }
                            throw err;
                        }
                    }}
                    onClose={() => setShowCancelModal(false)}
                />
            )}

            {dupOpen && (
                <DuplicateClassDialog
                    source={entry}
                    onClose={() => setDupOpen(false)}
                    onCreated={() => setDupOpen(false)}
                />
            )}

            {confirmDialog}
        </div>
    );
}

export default ScheduleEditPage;
