import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminAuthApi } from '@/shared/api/auth.api';
import { useAdminStore } from '@/shared/stores/adminStore';

const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

export function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useAdminStore((s) => s.setAuth);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;

        setError(null);
        setSubmitting(true);
        try {
            const result = await adminAuthApi.login({ email, password });
            setAuth({ token: result.token, admin: result.admin });
            navigate('/dashboard', { replace: true });
        } catch {
            // AC6: never leak which field was wrong — single Russian message for any failure.
            setError(INVALID_CREDENTIALS_MESSAGE);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
            <form
                onSubmit={onSubmit}
                className="w-full max-w-[400px] bg-card rounded-lg shadow p-6 space-y-4 border border-border"
                noValidate
            >
                <h1 className="heading-2 text-center">Админ-панель</h1>

                <div className="space-y-1">
                    <label htmlFor="admin-email" className="block text-body-secondary">
                        Email
                    </label>
                    <input
                        id="admin-email"
                        type="email"
                        autoComplete="username"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        disabled={submitting}
                    />
                </div>

                <div className="space-y-1">
                    <label htmlFor="admin-password" className="block text-body-secondary">
                        Пароль
                    </label>
                    <input
                        id="admin-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                    disabled={submitting || !email || !password}
                    className="w-full rounded-md bg-primary text-primary-foreground py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {submitting && (
                        <span
                            aria-hidden="true"
                            className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                        />
                    )}
                    <span>Войти</span>
                </button>
            </form>
        </div>
    );
}

export default LoginPage;
