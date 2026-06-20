import { useEffect, useState, type FormEvent } from 'react';

import {
    adminMembershipsApi,
    adminPlansApi,
    ApiError,
    isActiveExistsError,
    type IAdminMembership,
    type IPlanOption,
} from '@/shared/api';
import { todayIso } from '@/shared/lib/date';

interface IAssignMembershipModalProps {
    customerId: string;
    /**
     * Pre-filled start date in YYYY-MM-DD. When the customer already has an
     * active membership, parent passes `activeEndDate + 1` so the new plan
     * picks up the day after the current one ends — avoids the
     * ACTIVE_MEMBERSHIP_EXISTS conflict on submit.
     */
    initialStartDate?: string;
    onClose: () => void;
    onAssigned: (membership: IAdminMembership) => void;
}

interface IConflict {
    existingId: string;
    existingEndDate: string;
    message: string;
}

export function AssignMembershipModal({
    customerId,
    initialStartDate,
    onClose,
    onAssigned,
}: IAssignMembershipModalProps) {
    const [planOptions, setPlanOptions] = useState<IPlanOption[]>([]);
    const [planId, setPlanId] = useState('');
    const [startDate, setStartDate] = useState(initialStartDate ?? todayIso());
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [conflict, setConflict] = useState<IConflict | null>(null);

    useEffect(() => {
        let cancelled = false;
        adminPlansApi
            .getOptions()
            .then((opts) => {
                if (!cancelled) setPlanOptions(opts);
            })
            .catch(() => {
                // Non-fatal — admin sees an empty dropdown + can't submit.
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const doAssign = async (): Promise<void> => {
        const created = await adminMembershipsApi.assign(customerId, {
            planId,
            startDate,
            notes: notes.trim() || undefined,
        });
        onAssigned(created);
        onClose();
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setError(null);
        setConflict(null);
        if (!planId) {
            setError('Выберите план');
            return;
        }
        setSubmitting(true);
        try {
            await doAssign();
        } catch (err) {
            if (err instanceof ApiError && err.status === 409 && isActiveExistsError(err.data)) {
                setConflict({
                    existingId: err.data.existingActive.id,
                    existingEndDate: err.data.existingActive.endDate,
                    message: err.data.message,
                });
            } else if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось назначить абонемент');
            } else {
                setError(err instanceof Error ? err.message : 'Не удалось назначить абонемент');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelAndAssign = async (): Promise<void> => {
        if (!conflict) return;
        setSubmitting(true);
        setError(null);
        try {
            await adminMembershipsApi.cancel(conflict.existingId);
            await doAssign();
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось отменить старый абонемент');
            } else {
                setError(err instanceof Error ? err.message : 'Не удалось отменить старый абонемент');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-membership-title"
        >
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                <h3 id="assign-membership-title" className="heading-3 mb-4">
                    Назначить абонемент
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="plan-id" className="text-body mb-1 block">
                            План <span className="text-destructive">*</span>
                        </label>
                        <select
                            id="plan-id"
                            value={planId}
                            onChange={(e) => setPlanId(e.target.value)}
                            disabled={submitting || planOptions.length === 0}
                            className="w-full rounded border border-border bg-surface p-2 text-body"
                            required
                        >
                            <option value="">— выберите план —</option>
                            {planOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="start-date" className="text-body mb-1 block">
                            Дата начала
                        </label>
                        <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded border border-border bg-surface p-2 text-body"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="notes" className="text-body mb-1 block">
                            Примечание
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded border border-border bg-surface p-2 text-body"
                            rows={2}
                            maxLength={1000}
                        />
                    </div>

                    {error && <p className="text-destructive">{error}</p>}

                    {conflict && (
                        <div className="rounded border border-destructive/40 bg-destructive/10 p-3 text-sm">
                            <p className="mb-2">
                                У клиента уже есть активный абонемент до {formatDate(conflict.existingEndDate)}.
                                Отменить и назначить новый?
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCancelAndAssign}
                                    disabled={submitting}
                                    className="rounded bg-destructive px-3 py-1 text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    Отменить и назначить
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConflict(null)}
                                    disabled={submitting}
                                    className="rounded border border-border px-3 py-1 hover:bg-surface-hover disabled:opacity-50"
                                >
                                    Не назначать
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="rounded border border-border px-4 py-2 text-body hover:bg-surface-hover disabled:opacity-50"
                        >
                            Закрыть
                        </button>
                        {!conflict && (
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                            >
                                {submitting ? 'Назначение...' : 'Назначить'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

export default AssignMembershipModal;
