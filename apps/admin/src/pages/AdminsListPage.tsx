import { useCallback, useEffect, useState } from 'react';

import { adminUsersApi, ApiError, type IAdminUserListItem, type IIssuedTokenResponse } from '@/shared/api';
import { IssuedTokenLinkCard } from '@/shared/components/IssuedTokenLinkCard';
import { Modal } from '@/shared/components/Modal';
import { useAdminStore } from '@/shared/stores/adminStore';
import { KeyRound, Plus, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';

type TIssuedLink = IIssuedTokenResponse & { forLogin: string };

export function AdminsListPage() {
    const [admins, setAdmins] = useState<IAdminUserListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [resetTarget, setResetTarget] = useState<IAdminUserListItem | null>(null);
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
    const [issuedLink, setIssuedLink] = useState<TIssuedLink | null>(null);
    const currentAdminId = useAdminStore((s) => s.admin?.id);

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

    const confirmReset = async () => {
        if (!resetTarget || resettingId) return;
        const admin = resetTarget;
        setResettingId(admin.id);
        setError(null);
        try {
            const result = await adminUsersApi.resetPassword(admin.id);
            setIssuedLink({ ...result, forLogin: admin.login });
            setResetTarget(null);
        } catch {
            setError('Не удалось сбросить пароль');
        } finally {
            setResettingId(null);
        }
    };

    const onDeactivate = async (admin: IAdminUserListItem) => {
        if (deactivatingId) return;
        const ok = window.confirm(`Отключить администратора ${admin.login}? Он потеряет доступ.`);
        if (!ok) return;
        setDeactivatingId(admin.id);
        setError(null);
        try {
            await adminUsersApi.deactivate(admin.id);
            await refresh({ cancelled: false });
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                setError('Нельзя отключить самого себя или последнего активного администратора.');
            } else {
                setError('Не удалось отключить администратора');
            }
        } finally {
            setDeactivatingId(null);
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
                    forLogin={issuedLink.forLogin}
                    token={issuedLink.token}
                    expiresAt={issuedLink.expiresAt}
                    emailSent={issuedLink.emailSent}
                    sentToEmail={issuedLink.sentToEmail}
                    onDismiss={() => setIssuedLink(null)}
                />
            )}

            {loading && <p className="text-body-secondary">Загрузка...</p>}
            {error && <p className="text-destructive">{error}</p>}

            {!loading && !error && admins.length > 0 && (
                <table className="w-full border-collapse rounded border border-border bg-surface">
                    <thead>
                        <tr className="border-b border-border bg-muted/30 text-left text-sm text-body-secondary">
                            <th className="p-2">Логин</th>
                            <th className="p-2">Имя</th>
                            <th className="w-28 p-2">Статус</th>
                            <th className="w-44 p-2">Последний вход</th>
                            <th className="w-44 p-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {admins.map((a) => (
                            <tr key={a.id} className="border-b border-border hover:bg-muted/20">
                                <td className="p-2">{a.login}</td>
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setResetTarget(a)}
                                            disabled={resettingId === a.id}
                                            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                        >
                                            <KeyRound className="h-3 w-3" />
                                            {resettingId === a.id ? 'Создание...' : 'Сбросить пароль'}
                                        </button>
                                        {a.isActive && a.id !== currentAdminId && (
                                            <button
                                                type="button"
                                                onClick={() => onDeactivate(a)}
                                                disabled={deactivatingId === a.id}
                                                className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                                            >
                                                <UserX className="h-3 w-3" />
                                                {deactivatingId === a.id ? 'Отключение...' : 'Отключить'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {resetTarget && (
                <Modal title="Сбросить пароль" onClose={() => setResetTarget(null)}>
                    <p className="text-body mb-4">
                        Сбросить пароль для <strong>{resetTarget.login}</strong>? Будет создана новая одноразовая ссылка
                        для входа.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setResetTarget(null)}
                            disabled={resettingId === resetTarget.id}
                            className="rounded-md border border-border px-4 py-2 hover:bg-muted disabled:opacity-60"
                        >
                            Отмена
                        </button>
                        <button
                            type="button"
                            onClick={confirmReset}
                            disabled={resettingId === resetTarget.id}
                            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent-active disabled:opacity-60"
                        >
                            {resettingId === resetTarget.id ? 'Создание...' : 'Сбросить пароль'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default AdminsListPage;
