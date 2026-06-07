import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { adminPasswordSetupApi, ApiError, type IInviteTokenInfo } from '@/shared/api';
import { useNavigate, useSearchParams } from 'react-router-dom';

const INVALID_LINK_MESSAGE = 'Ссылка недействительна или истекла';
const POLICY_MESSAGE = 'Пароль должен быть не короче 8 символов и содержать букву и цифру';
const MISMATCH_MESSAGE = 'Пароли не совпадают';

function passwordMeetsPolicy(p: string): boolean {
    return p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
}

export function SetPasswordPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';

    const [info, setInfo] = useState<IInviteTokenInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setLoadError(INVALID_LINK_MESSAGE);
            setLoading(false);
            return;
        }
        let cancelled = false;
        adminPasswordSetupApi
            .getTokenInfo(token)
            .then((data) => {
                if (cancelled) return;
                setInfo(data);
                setLoading(false);
            })
            .catch(() => {
                if (cancelled) return;
                setLoadError(INVALID_LINK_MESSAGE);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token]);

    const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitError(null);

        if (!passwordMeetsPolicy(password)) {
            setSubmitError(POLICY_MESSAGE);
            return;
        }
        if (password !== confirm) {
            setSubmitError(MISMATCH_MESSAGE);
            return;
        }

        setSubmitting(true);
        try {
            await adminPasswordSetupApi.setPassword(token, password);
            navigate('/login?password_set=1', { replace: true });
        } catch (err) {
            if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
                setSubmitError(INVALID_LINK_MESSAGE);
            } else if (err instanceof ApiError && err.status === 400) {
                setSubmitError(POLICY_MESSAGE);
            } else {
                setSubmitError('Не удалось сохранить пароль. Попробуйте ещё раз.');
            }
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
            <div className="w-full max-w-[440px] bg-card rounded-lg shadow p-6 space-y-4 border border-border">
                <h1 className="heading-2 text-center">Установка пароля</h1>

                {loading && <p className="text-body-secondary text-center">Загрузка...</p>}

                {!loading && loadError && (
                    <p role="alert" className="text-sm text-destructive text-center">
                        {loadError}
                    </p>
                )}

                {!loading && info && (
                    <form onSubmit={onSubmit} className="space-y-4" noValidate>
                        <p className="text-body-secondary text-sm">
                            {info.purpose === 'invite' ? 'Добро пожаловать,' : 'Сброс пароля для'}{' '}
                            <span className="text-body">{info.name}</span> ({info.email})
                        </p>

                        <div className="space-y-1">
                            <label htmlFor="new-password" className="block text-body-secondary">
                                Новый пароль
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={submitting}
                            />
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirm-password" className="block text-body-secondary">
                                Подтверждение
                            </label>
                            <input
                                id="confirm-password"
                                type="password"
                                autoComplete="new-password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                disabled={submitting}
                            />
                        </div>

                        <p className="text-xs text-body-secondary">{POLICY_MESSAGE}</p>

                        {submitError && (
                            <p role="alert" className="text-sm text-destructive">
                                {submitError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || !password || !confirm}
                            className="w-full rounded-md bg-primary text-primary-foreground py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting && (
                                <span
                                    aria-hidden="true"
                                    className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                                />
                            )}
                            <span>Сохранить пароль</span>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default SetPasswordPage;
