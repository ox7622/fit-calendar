import { useEffect, useState, type FormEvent } from 'react';

import { adminMembershipsApi, ApiError, type IAdminMembership, type IFreezeEvent } from '@/shared/api';
import { addDaysIso, fmtDate, nextStartAfter, todayIso } from '@/shared/lib/date';

interface IFreezePanelProps {
    membership: IAdminMembership;
    onMembershipChange: (next: IAdminMembership) => void;
}

// Inclusive [start, start+duration-1] vs. inclusive [f.startDate, f.endDate].
// YYYY-MM-DD strings compare lexicographically.
function findOverlap(freezes: IFreezeEvent[], startDate: string, durationDays: number): IFreezeEvent | null {
    if (!startDate || !Number.isInteger(durationDays) || durationDays < 1) return null;
    const endDate = addDaysIso(startDate, durationDays - 1);
    return freezes.find((f) => startDate <= f.endDate && f.startDate <= endDate) ?? null;
}

export function FreezePanel({ membership, onMembershipChange }: IFreezePanelProps) {
    const [freezes, setFreezes] = useState<IFreezeEvent[]>([]);
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
                    setFreezes(rows);
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

    const overlap = findOverlap(freezes, startDate, durationDays);

    const handleRecord = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        if (overlap) {
            setError(
                `Эти даты пересекаются с заморозкой ${fmtDate(overlap.startDate)} – ${fmtDate(overlap.endDate)}. ` +
                    `Выберите другие.`,
            );
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const result = await adminMembershipsApi.recordFreeze(membership.id, {
                startDate,
                durationDays,
                notes: notes.trim() || undefined,
            });
            setFreezes((prev) => [result.freeze, ...prev]);
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

    const handleUndo = async (freezeId: string): Promise<void> => {
        if (!window.confirm('Отменить заморозку? Срок действия абонемента вернётся на её длительность назад.')) return;
        setBusy(true);
        setError(null);
        try {
            const { membership: updated } = await adminMembershipsApi.undoFreeze(freezeId);
            setFreezes((prev) => prev.filter((f) => f.id !== freezeId));
            onMembershipChange(updated);
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось отменить заморозку' : 'Не удалось отменить заморозку');
        } finally {
            setBusy(false);
        }
    };

    const canFreeze = membership.freezeDaysRemaining > 0 && membership.status === 'active';

    return (
        <div className="rounded border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-body">
                    Доступно дней заморозки: {membership.freezeDaysRemaining} / {membership.plan.freezeDaysAllowed}
                </p>
                <button
                    type="button"
                    onClick={() => {
                        setStartDate(nextStartAfter(freezes.map((f) => f.endDate)));
                        setShowDialog(true);
                    }}
                    disabled={busy || !canFreeze}
                    className="rounded bg-primary px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                    Заморозить
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-body-secondary">Загрузка...</p>
            ) : freezes.length === 0 ? (
                <p className="text-sm text-body-secondary">Заморозок ещё не было.</p>
            ) : (
                <ul className="space-y-2">
                    {freezes.map((freeze) => (
                        <li key={freeze.id} className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm text-body">
                                    ❄️ {fmtDate(freeze.startDate)} – {fmtDate(freeze.endDate)} ({freeze.durationDays}{' '}
                                    дн.)
                                </p>
                                {freeze.notes && <p className="text-xs text-body-secondary mt-0.5">{freeze.notes}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => handleUndo(freeze.id)}
                                disabled={busy}
                                className="text-xs text-destructive hover:underline disabled:opacity-50"
                            >
                                Отменить
                            </button>
                        </li>
                    ))}
                </ul>
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
                            {overlap && !error && (
                                <p className="text-sm text-destructive">
                                    Эти даты пересекаются с заморозкой {fmtDate(overlap.startDate)} –{' '}
                                    {fmtDate(overlap.endDate)}.
                                </p>
                            )}
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
                                    disabled={busy || !!overlap}
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
