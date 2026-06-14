import { useState } from 'react';

import { adminScheduleApi, ApiError, type IAdminScheduleItem } from '@/shared/api';
import { Modal } from '@/shared/components/Modal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface IMoveClassConfirmProps {
    item: IAdminScheduleItem;
    /** New ISO start time (date swapped, time-of-day preserved). */
    newStartTime: string;
    /** Called after a successful move so the page can reload + toast. */
    onMoved: () => void;
    onClose: () => void;
}

function fmt(iso: string): string {
    return format(parseISO(iso), 'EEE d MMM, HH:mm', { locale: ru });
}

export function MoveClassConfirm({ item, newStartTime, onMoved, onClose }: IMoveClassConfirmProps): JSX.Element {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async (): Promise<void> => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await adminScheduleApi.update(item.id, { startTime: newStartTime });
            onMoved();
            onClose();
        } catch (err) {
            const fallback = 'Не удалось перенести занятие';
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? fallback);
            } else {
                setError(fallback);
            }
            setSubmitting(false);
        }
    };

    return (
        <Modal title="Перенести занятие" onClose={onClose}>
            <p className="text-body mb-4">
                Перенести «{item.trainingType.name}» с <strong>{fmt(item.startTime)}</strong> на{' '}
                <strong>{fmt(newStartTime)}</strong>?
            </p>
            <p className="text-body-secondary mb-4 text-sm">Записанные клиенты получат уведомление.</p>
            {error && (
                <p role="alert" className="text-destructive mb-3 text-sm">
                    {error}
                </p>
            )}
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-md border border-border px-4 py-2 hover:bg-muted disabled:opacity-60"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={submitting}
                    className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent-active disabled:opacity-60"
                >
                    {submitting ? 'Перенос...' : 'Перенести'}
                </button>
            </div>
        </Modal>
    );
}
