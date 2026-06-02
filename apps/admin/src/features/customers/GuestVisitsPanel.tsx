import { useEffect, useState, type FormEvent } from 'react';

import { adminMembershipsApi, ApiError, type IAdminMembership, type IGuestVisit } from '@/shared/api';

interface IGuestVisitsPanelProps {
    membership: IAdminMembership;
    onRemainingChange: (next: number) => void;
}

function fmtDate(iso: string): string {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()} ${hh}:${mm}`;
}

function nowLocalIsoForInput(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
        d.getMinutes(),
    )}`;
}

export function GuestVisitsPanel({ membership, onRemainingChange }: IGuestVisitsPanelProps) {
    const [visits, setVisits] = useState<IGuestVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [visitedAt, setVisitedAt] = useState(nowLocalIsoForInput());
    const [notes, setNotes] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        adminMembershipsApi
            .getGuestVisits(membership.id)
            .then((data) => {
                if (!cancelled) {
                    setVisits(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setError('Не удалось загрузить визиты');
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [membership.id]);

    if (membership.plan.guestVisitsAllowed === 0) return null;

    const used = membership.plan.guestVisitsAllowed - membership.guestVisitsRemaining;
    const canRecord = membership.guestVisitsRemaining > 0 && membership.status === 'active';

    const handleRecord = async (e: FormEvent): Promise<void> => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const result = await adminMembershipsApi.recordGuestVisit(membership.id, {
                visitedAt: new Date(visitedAt).toISOString(),
                notes: notes.trim() || undefined,
            });
            setVisits((prev) => [result.visit, ...prev]);
            onRemainingChange(result.remaining);
            setShowDialog(false);
            setNotes('');
            setVisitedAt(nowLocalIsoForInput());
        } catch (err) {
            if (err instanceof ApiError) {
                const body = err.data as { message?: string } | null;
                setError(body?.message ?? 'Не удалось записать визит');
            } else {
                setError('Не удалось записать визит');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleUndo = async (visitId: string): Promise<void> => {
        if (!window.confirm('Удалить запись о визите?')) return;
        setBusy(true);
        setError(null);
        try {
            const result = await adminMembershipsApi.undoGuestVisit(visitId);
            setVisits((prev) => prev.filter((v) => v.id !== visitId));
            onRemainingChange(result.remaining);
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось отменить' : 'Не удалось отменить');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded border border-border bg-card p-3 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-body">
                    Гостевые визиты: {used} из {membership.plan.guestVisitsAllowed} использовано
                </p>
                <button
                    type="button"
                    onClick={() => setShowDialog(true)}
                    disabled={!canRecord || busy}
                    className="rounded bg-primary px-3 py-1 text-sm text-white hover:opacity-90 disabled:opacity-50"
                >
                    Записать гостевой визит
                </button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            {loading ? (
                <p className="text-sm text-body-secondary">Загрузка...</p>
            ) : visits.length === 0 ? (
                <p className="text-sm text-body-secondary">Пока записей нет.</p>
            ) : (
                <ul className="space-y-1">
                    {visits.map((v) => (
                        <li key={v.id} className="flex items-center justify-between text-sm">
                            <span>
                                {fmtDate(v.visitedAt)}
                                {v.notes ? ` — ${v.notes}` : ''}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleUndo(v.id)}
                                disabled={busy}
                                className="text-xs text-destructive hover:underline disabled:opacity-50"
                            >
                                Удалить
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {showDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                        <h3 className="heading-3 mb-3">Гостевой визит</h3>
                        <form onSubmit={handleRecord} className="space-y-3">
                            <div>
                                <label htmlFor="visited-at" className="text-body mb-1 block">
                                    Дата и время
                                </label>
                                <input
                                    id="visited-at"
                                    type="datetime-local"
                                    value={visitedAt}
                                    onChange={(e) => setVisitedAt(e.target.value)}
                                    disabled={busy}
                                    className="w-full rounded border border-border bg-surface p-2 text-body"
                                />
                            </div>
                            <div>
                                <label htmlFor="visit-notes" className="text-body mb-1 block">
                                    Примечание
                                </label>
                                <textarea
                                    id="visit-notes"
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
                                    {busy ? 'Запись...' : 'Записать'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GuestVisitsPanel;
