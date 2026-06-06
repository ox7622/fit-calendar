import type { FormEvent } from 'react';
import { useState } from 'react';

import { adminUsersApi, ApiError, type IIssuedTokenResponse } from '@/shared/api';
import { IssuedTokenLinkCard } from '@/shared/components/IssuedTokenLinkCard';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminInvitePage() {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [issued, setIssued] = useState<IIssuedTokenResponse | null>(null);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSubmitting(true);
        try {
            const result = await adminUsersApi.invite({ email, name });
            setIssued(result);
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                setError('Этот email уже используется активным админом. Используйте «Сбросить пароль».');
            } else if (err instanceof ApiError && err.status === 400) {
                setError('Проверьте корректность email и имени.');
            } else {
                setError('Не удалось создать приглашение.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4 p-6 max-w-[600px]">
            <div className="flex items-center gap-2">
                <Link
                    to="/admins"
                    className="inline-flex items-center gap-1 text-body-secondary hover:text-body text-sm"
                >
                    <ArrowLeft className="h-4 w-4" /> Назад
                </Link>
            </div>
            <h2 className="heading-2">Пригласить администратора</h2>

            {!issued && (
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                    <div className="space-y-1">
                        <label htmlFor="invite-email" className="block text-body-secondary">
                            Email
                        </label>
                        <input
                            id="invite-email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="invite-name" className="block text-body-secondary">
                            Имя
                        </label>
                        <input
                            id="invite-name"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={submitting}
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !email || !name}
                        className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting && (
                            <span
                                aria-hidden="true"
                                className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                            />
                        )}
                        <span>Создать приглашение</span>
                    </button>
                </form>
            )}

            {issued && (
                <div className="space-y-3">
                    <IssuedTokenLinkCard
                        forEmail={email}
                        token={issued.token}
                        expiresAt={issued.expiresAt}
                        actionLabel={issued.action === 'created' ? 'новый аккаунт' : 'переактивация'}
                    />
                    <Link
                        to="/admins"
                        className="inline-block rounded border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted"
                    >
                        К списку
                    </Link>
                </div>
            )}
        </div>
    );
}

export default AdminInvitePage;
