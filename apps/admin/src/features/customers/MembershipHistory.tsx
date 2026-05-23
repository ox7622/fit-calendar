import { useState } from 'react';

import { adminMembershipsApi, ApiError, type IAdminMembership } from '@/shared/api';

interface IMembershipHistoryProps {
    items: IAdminMembership[];
    onChange: (next: IAdminMembership[]) => void;
}

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
}

const STATUS_LABEL: Record<IAdminMembership['status'], string> = {
    active: 'Активен',
    expired: 'Истёк',
    cancelled: 'Отменён',
};

const STATUS_COLOR: Record<IAdminMembership['status'], string> = {
    active: 'bg-primary/15 text-primary',
    expired: 'bg-muted text-body-secondary',
    cancelled: 'bg-destructive/15 text-destructive',
};

export function MembershipHistory({ items, onChange }: IMembershipHistoryProps) {
    const active = items.find((m) => m.status === 'active');
    const past = items.filter((m) => m.id !== active?.id);
    const [showPast, setShowPast] = useState(false);
    const [editingEndDate, setEditingEndDate] = useState(false);
    const [endDateDraft, setEndDateDraft] = useState(active?.endDate ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCancel = async (id: string): Promise<void> => {
        if (!window.confirm('Отменить абонемент?')) return;
        setBusy(true);
        setError(null);
        try {
            const cancelled = await adminMembershipsApi.cancel(id);
            onChange(items.map((m) => (m.id === id ? cancelled : m)));
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось отменить' : 'Не удалось отменить');
        } finally {
            setBusy(false);
        }
    };

    const handleSaveEndDate = async (): Promise<void> => {
        if (!active) return;
        setBusy(true);
        setError(null);
        try {
            const updated = await adminMembershipsApi.update(active.id, { endDate: endDateDraft });
            onChange(items.map((m) => (m.id === active.id ? updated : m)));
            setEditingEndDate(false);
        } catch (err) {
            setError(err instanceof ApiError ? 'Не удалось сохранить дату' : 'Не удалось сохранить дату');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            {active ? (
                <div className="rounded border border-primary/40 bg-primary/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="font-semibold text-body">{active.plan.name}</p>
                            <p className="text-sm text-body-secondary">
                                с {formatDate(active.startDate)} до{' '}
                                {editingEndDate ? (
                                    <input
                                        type="date"
                                        value={endDateDraft}
                                        onChange={(e) => setEndDateDraft(e.target.value)}
                                        disabled={busy}
                                        className="rounded border border-border bg-surface p-1 text-sm"
                                    />
                                ) : (
                                    formatDate(active.endDate)
                                )}{' '}
                                · осталось {active.daysRemaining} дн.
                            </p>
                            <p className="text-sm text-body-secondary">
                                Гостевые визиты: {active.guestVisitsRemaining} / {active.plan.guestVisitsAllowed} ·
                                Заморозка: {active.freezeDaysRemaining} / {active.plan.freezeDaysAllowed} дн.
                            </p>
                            {active.notes && <p className="text-sm text-body-secondary mt-1">{active.notes}</p>}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            {editingEndDate ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleSaveEndDate}
                                        disabled={busy}
                                        className="rounded bg-primary px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                                    >
                                        Сохранить
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingEndDate(false);
                                            setEndDateDraft(active.endDate);
                                        }}
                                        disabled={busy}
                                        className="text-xs text-body-secondary hover:underline"
                                    >
                                        Отмена
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEndDateDraft(active.endDate);
                                            setEditingEndDate(true);
                                        }}
                                        disabled={busy}
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Изменить дату
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleCancel(active.id)}
                                        disabled={busy}
                                        className="text-xs text-destructive hover:underline"
                                    >
                                        Отменить абонемент
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                </div>
            ) : (
                <p className="text-body-secondary">Активного абонемента нет.</p>
            )}

            {past.length > 0 && (
                <div>
                    <button
                        type="button"
                        onClick={() => setShowPast((s) => !s)}
                        className="text-sm text-body-secondary hover:underline"
                    >
                        {showPast ? 'Скрыть' : 'Показать'} историю ({past.length})
                    </button>
                    {showPast && (
                        <table className="mt-2 w-full text-sm">
                            <thead className="bg-muted/30 text-left text-body-secondary">
                                <tr>
                                    <th className="p-1">План</th>
                                    <th className="p-1">Начало</th>
                                    <th className="p-1">Конец</th>
                                    <th className="p-1">Статус</th>
                                </tr>
                            </thead>
                            <tbody>
                                {past.map((m) => (
                                    <tr key={m.id} className="border-t border-border">
                                        <td className="p-1">{m.plan.name}</td>
                                        <td className="p-1">{formatDate(m.startDate)}</td>
                                        <td className="p-1">{formatDate(m.endDate)}</td>
                                        <td className="p-1">
                                            <span className={`rounded px-2 py-0.5 text-xs ${STATUS_COLOR[m.status]}`}>
                                                {STATUS_LABEL[m.status]}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default MembershipHistory;
