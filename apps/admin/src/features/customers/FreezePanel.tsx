import { useEffect, useState, type FormEvent } from 'react';

import { adminMembershipsApi, ApiError, type IAdminMembership, type IFreezeEvent } from '@/shared/api';

interface IFreezePanelProps {
    membership: IAdminMembership;
    onMembershipChange: (next: IAdminMembership) => void;
}

function fmtDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

function todayIso(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function FreezePanel({ membership, onMembershipChange }: IFreezePanelProps) {
    const [freeze, setFreeze] = useState<IFreezeEvent | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [startDate, setStartDate] = useState(todayIso());
    const [durationDays, setDurationDays] = useState<number>(7);
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        adminMembershipsApi
            .getFreezes(membership.id)
            .then((rows) => {
                if (!cancelled) {
                    setFreeze(rows[0] ?? null);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить заморозки');
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [membership.id]);

    if (membership.plan.freezeDaysAllowed === 0) return null;

    const handleRecord = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const result = await adminMembershipsApi.recordFreeze(membership.id, {
                startDate,
                durationDays,
                notes: notes.trim() || undefined,
            });
            setFreeze(result.freeze);
            onMembershipChange(result.membership);
            setShowDialog(false);
            setNotes('');
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось записать заморозку');
            } else {
                setError('Не удалось записать заморозку');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleUndo = async (): Promise<void> => {
        if (!freeze) return;
        if (!window.confirm('Отменить заморозку? Срок действия абонемента вернётся к прежней дате.')) return;
        setBusy(true);
        setError(null);
        try {
            const { membership: updated } = await adminMembershipsApi.undoFreeze(freeze.id);
            setFreeze(null);
            onMembershipChange(updated);
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось отменить заморозку' : 'Не удалось отменить заморозку');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded border border-border bg-card p-3 space-y-3">
            {loading ? (
                <p className="text-sm text-body-secondary">Загрузка...</p>
            ) : freeze ? (
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-body font-semibold">❄️ Заморозка</p>
                        <p className="text-sm text-body-secondary">
                            {fmtDate(freeze.startDate)} – {fmtDate(freeze.endDate)} ({freeze.durationDays} дн.)
                        </p>
                        {freeze.notes && <p className="text-sm text-body-secondary mt-1">{freeze.notes}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={handleUndo}
                        disabled={busy}
                        className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                        Отменить заморозку
                    </button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <p className="text-body">
                        Доступно дней заморозки: {membership.freezeDaysRemaining} / {membership.plan.freezeDaysAllowed}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowDialog(true)}
                        disabled={busy || membership.freezeDaysRemaining === 0 || membership.status !== 'active'}
                        className="rounded bg-primary px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
                    >
                        Заморозить
                    </button>
                </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                        <h3 className="heading-3 mb-3">Заморозка абонемента</h3>
                        <form onSubmit={handleRecord} className="space-y-3">
                            <div>
                                <label htmlFor="freeze-start" className="text-body mb-1 block">
                                    Дата начала
                                </label>
                                <input
                                    id="freeze-start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={busy}
                                    className="w-full rounded border border-border bg-surface p-2 text-body"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="freeze-duration" className="text-body mb-1 block">
                                    Дней (доступно: {membership.freezeDaysRemaining})
                                </label>
                                <input
                                    id="freeze-duration"
                                    type="number"
                                    min={1}
                                    max={membership.freezeDaysRemaining}
                                    value={durationDays}
                                    onChange={(e) => setDurationDays(Number(e.target.value))}
                                    disabled={busy}
                                    className="w-full rounded border border-border bg-surface p-2 text-body"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="freeze-notes" className="text-body mb-1 block">
                                    Примечание
                                </label>
                                <textarea
                                    id="freeze-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    disabled={busy}
                                    className="w-full rounded border border-border bg-surface p-2 text-body"
                                    rows={2}
                                    maxLength={500}
                                />
                            </div>
                            {error && <p className="text-sm text-destructive">{error}</p>}
                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDialog(false)}
                                    disabled={busy}
                                    className="rounded border border-border px-3 py-1 text-body hover:bg-surface-hover disabled:opacity-50"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="rounded bg-primary px-3 py-1 text-white hover:opacity-90 disabled:opacity-50"
                                >
                                    {busy ? 'Запись...' : 'Заморозить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default FreezePanel;
