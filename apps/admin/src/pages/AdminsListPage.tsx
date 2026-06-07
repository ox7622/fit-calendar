import { useCallback, useEffect, useState } from 'react';

import { adminUsersApi, type IAdminUserListItem, type IIssuedTokenResponse } from '@/shared/api';
import { IssuedTokenLinkCard } from '@/shared/components/IssuedTokenLinkCard';
import { KeyRound, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

type TIssuedLink = IIssuedTokenResponse & { forEmail: string };

export function AdminsListPage() {
    const [admins, setAdmins] = useState<IAdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [issuedLink, setIssuedLink] = useState<TIssuedLink | null>(null);

    const refresh = useCallback(async (signal: { cancelled: boolean }) => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminUsersApi.list();
            if (signal.cancelled) return;
            setAdmins(data);
        } catch {
            if (signal.cancelled) return;
            setError('Не удалось загрузить администраторов');
        } finally {
            if (!signal.cancelled) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const signal = { cancelled: false };
        void refresh(signal);
        return () => {
            signal.cancelled = true;
        };
    }, [refresh]);

    const onReset = async (admin: IAdminUserListItem) => {
        if (resettingId) return;
        const ok = window.confirm(`Сбросить пароль для ${admin.email}?`);
        if (!ok) return;
        setResettingId(admin.id);
        try {
            const result = await adminUsersApi.resetPassword(admin.id);
            setIssuedLink({ ...result, forEmail: admin.email });
        } catch {
            setError('Не удалось сбросить пароль');
        } finally {
            setResettingId(null);
        }
    };

    return (
        <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
                <h2 className="heading-2">Администраторы</h2>
                <Link
                    to="/admins/invite"
                    className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-white hover:opacity-90"
                >
                    <Plus className="h-4 w-4" /> Пригласить
                </Link>
            </div>

            {issuedLink && (
                <IssuedTokenLinkCard
                    forEmail={issuedLink.forEmail}
                    token={issuedLink.token}
                    expiresAt={issuedLink.expiresAt}
                    onDismiss={() => setIssuedLink(null)}
                />
            )}

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && admins.length > 0 && (
                <table className="w-full border-collapse rounded border border-border bg-surface">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-sm text-body-secondary">
                            <th className="p-2">Email</th>
                            <th className="p-2">Имя</th>
                            <th className="w-28 p-2">Статус</th>
                            <th className="w-44 p-2">Последний вход</th>
                            <th className="w-44 p-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map((a) => (
                            <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                                <td className="p-2">{a.email}</td>
                                <td className="p-2">{a.name}</td>
                                <td className="p-2">
                                    {a.isActive ? (
                                        <span className="rounded bg-primary/15 px-2 py-0.5 text-xs text-primary">
                                            Активен
                                        </span>
                                    ) : (
                                        <span className="rounded bg-muted px-2 py-0.5 text-xs text-body-secondary">
                                            Не активирован
                                        </span>
                                    )}
                                </td>
                                <td className="p-2 text-body-secondary text-sm">
                                    {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString('ru-RU') : '—'}
                                </td>
                                <td className="p-2">
                                    <button
                                        type="button"
                                        onClick={() => onReset(a)}
                                        disabled={resettingId === a.id}
                                        className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                    >
                                        <KeyRound className="h-3 w-3" />
                                        {resettingId === a.id ? 'Создание...' : 'Сбросить пароль'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default AdminsListPage;
