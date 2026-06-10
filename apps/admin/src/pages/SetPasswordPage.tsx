import type { FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { adminPasswordSetupApi, ApiError, type IInviteTokenInfo } from '@/shared/api';
import { PasswordInput } from '@/shared/components/PasswordInput';
import { useNavigate, useSearchParams } from 'react-router-dom';

const INVALID_LINK_MESSAGE = 'Ссылка недействительна или истекла';
const POLICY_MESSAGE = 'Пароль должен быть от 8 до 128 символов и содержать букву и цифру';
const MISMATCH_MESSAGE = 'Пароли не совпадают';

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

type ConfirmStatus = 'idle' | 'match' | 'mismatch';

const CONFIRM_STATUS: Record<ConfirmStatus, { cls: string; text: string }> = {
    idle: { cls: 'text-body-secondary', text: 'Повторите пароль' },
    match: { cls: 'text-success', text: 'Пароли совпадают' },
    mismatch: { cls: 'text-destructive', text: MISMATCH_MESSAGE },
};

interface IPasswordChecks {
    length: boolean;
    letter: boolean;
    digit: boolean;
}

function checkPassword(p: string): IPasswordChecks {
    return {
        length: p.length >= PASSWORD_MIN && p.length <= PASSWORD_MAX,
        letter: /[A-Za-z]/.test(p),
        digit: /\d/.test(p),
    };
}

function RuleItem({ ok, children }: { ok: boolean; children: ReactNode }) {
    return (
        <li className={`flex items-center gap-2 text-xs ${ok ? 'text-success' : 'text-body-secondary'}`}>
            <span aria-hidden="true" className="inline-block w-3.5 text-center">
                {ok ? '✓' : '•'}
            </span>
            {children}
        </li>
    );
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

    const checks = checkPassword(password);
    const policyOk = checks.length && checks.letter && checks.digit;
    const confirmStatus: ConfirmStatus = confirm.length === 0 ? 'idle' : password === confirm ? 'match' : 'mismatch';
    const canSubmit = policyOk && confirmStatus === 'match' && !submitting;

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

        if (!policyOk) {
            setSubmitError(POLICY_MESSAGE);
            return;
        }
        if (confirmStatus !== 'match') {
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

    const confirmView = CONFIRM_STATUS[confirmStatus];

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
                            <span className="text-body">{info.name}</span> ({info.login})
                        </p>

                        <div className="space-y-1">
                            <label htmlFor="new-password" className="block text-body-secondary">
                                Новый пароль
                            </label>
                            <PasswordInput
                                id="new-password"
                                autoComplete="new-password"
                                required
                                aria-invalid={password.length > 0 && !policyOk}
                                aria-describedby="password-rules"
                                value={password}
                                onChange={setPassword}
                                disabled={submitting}
                            />
                            <ul id="password-rules" className="pt-1 space-y-1">
                                <RuleItem ok={checks.length}>От 8 до 128 символов</RuleItem>
                                <RuleItem ok={checks.letter}>Содержит букву</RuleItem>
                                <RuleItem ok={checks.digit}>Содержит цифру</RuleItem>
                            </ul>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="confirm-password" className="block text-body-secondary">
                                Подтверждение
                            </label>
                            <PasswordInput
                                id="confirm-password"
                                autoComplete="new-password"
                                required
                                aria-invalid={confirmStatus === 'mismatch'}
                                aria-describedby="confirm-status"
                                value={confirm}
                                onChange={setConfirm}
                                disabled={submitting}
                            />
                            <p
                                id="confirm-status"
                                className={`text-xs ${confirmView.cls}`}
                                role={confirmStatus === 'mismatch' ? 'alert' : undefined}
                            >
                                {confirmView.text}
                            </p>
                        </div>

                        {submitError && (
                            <p role="alert" className="text-sm text-destructive">
                                {submitError}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={!canSubmit}
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
