import { useState } from 'react';

import { NOTIFY_USERS_LABEL } from './notify-window';

interface ICancelClassModalProps {
    className: string;
    startTimeLabel: string;
    affectedReminderHint?: string;
    /** When true, show that cancelling pushes all bot users (class within 5 days). */
    willPush?: boolean;
    onConfirm: (reason: string | null, notify: boolean) => Promise<void>;
    onClose: () => void;
}

const MAX_REASON_LENGTH = 500;

export function CancelClassModal({
    className,
    startTimeLabel,
    affectedReminderHint,
    willPush = false,
    onConfirm,
    onClose,
}: ICancelClassModalProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notify, setNotify] = useState(true);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const trimmed = reason.trim();
            await onConfirm(trimmed.length === 0 ? null : trimmed, notify);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось отменить занятие');
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
        >
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                <h3 id="cancel-modal-title" className="heading-3 mb-2">
                    Отменить занятие?
                </h3>
                <p className="text-body-secondary mb-4">
                    {className} — {startTimeLabel}
                </p>
                {affectedReminderHint && <p className="text-body-secondary mb-4 text-sm">{affectedReminderHint}</p>}
                {willPush && (
                    <>
                        <p className="text-amber-600 mb-4 text-sm">
                            ⚠️ Занятие в ближайшие 5 дней. Все пользователи бота получат пуш об отмене.
                        </p>
                        <label className="text-body mb-4 flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={notify}
                                onChange={(e) => setNotify(e.target.checked)}
                                className="h-4 w-4"
                            />
                            {NOTIFY_USERS_LABEL}
                        </label>
                    </>
                )}

                <label htmlFor="cancel-reason" className="text-body mb-1 block">
                    Причина (необязательно)
                </label>
                <textarea
                    id="cancel-reason"
                    className="w-full rounded border border-border bg-surface p-2 text-body"
                    rows={3}
                    maxLength={MAX_REASON_LENGTH}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Например: Тренер заболел"
                    disabled={submitting}
                />
                <p className="text-body-secondary mb-4 text-xs">
                    {reason.length} / {MAX_REASON_LENGTH}
                </p>

                {error && <p className="text-destructive mb-3">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded border border-border px-4 py-2 text-body hover:bg-surface-hover disabled:opacity-50"
                    >
                        Закрыть
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={submitting}
                        className="rounded bg-destructive px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {submitting ? 'Отмена...' : 'Отменить занятие'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CancelClassModal;
