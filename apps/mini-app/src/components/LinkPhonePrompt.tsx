import { VALIDATION_MESSAGES } from '@fitcalendar/shared';
import { FormEvent, useState } from 'react';

import { ApiError, meApi } from '@/shared/api';
import { useCustomerStore } from '@/shared/stores';

const ERROR_MESSAGES_RU: Record<string, string> = {
    INVALID_PHONE_FORMAT: VALIDATION_MESSAGES.INVALID_PHONE_FORMAT,
    PHONE_NOT_FOUND: 'Этот номер не зарегистрирован. Обратитесь на ресепшн.',
    PHONE_ALREADY_LINKED_TO_OTHER: 'Этот номер уже привязан к другому аккаунту. Свяжитесь с админом.',
};

function extractErrorCode(error: unknown): string | null {
    if (error instanceof ApiError) {
        const body = error.data as { code?: unknown } | null;
        if (body && typeof body.code === 'string') return body.code;
    }
    return null;
}

interface LinkPhonePromptProps {
    /** Shown above the input as a subtitle. Defaults to "Привяжите номер, чтобы продолжить". */
    subtitle?: string;
    /** Called after a successful link, AFTER the store has been updated. */
    onLinked?: () => void;
}

/**
 * Story 7.2 — phone-linking flow for users whose Telegram identity isn't yet
 * tied to a customer record. Used by `AuthProvider` when `linked === false`
 * and by Story 7.4's profile page.
 */
export function LinkPhonePrompt({ subtitle, onLinked }: LinkPhonePromptProps): JSX.Element {
    const setLinked = useCustomerStore((s) => s.setLinked);

    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (submitting || !phone.trim()) return;
        setError(null);
        setSubmitting(true);
        try {
            const customer = await meApi.linkPhone(phone.trim());
            setLinked(customer);
            onLinked?.();
        } catch (err) {
            const code = extractErrorCode(err);
            setError(
                (code && ERROR_MESSAGES_RU[code]) ??
                    'Не удалось привязать номер. Попробуйте ещё раз или обратитесь на ресепшн.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
            <div className="w-full max-w-sm">
                <h1 className="heading-2 text-center mb-2">Привязка профиля</h1>
                <p className="text-sm text-muted-foreground text-center mb-6">
                    {subtitle ?? 'Введите номер, указанный при регистрации в клубе.'}
                </p>

                <form onSubmit={onSubmit} className="space-y-3" noValidate>
                    <div className="space-y-1">
                        <label htmlFor="phone" className="block text-sm text-muted-foreground">
                            Телефон
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="+7 999 555 12 34"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                            required
                        />
                    </div>

                    {error && (
                        <p role="alert" className="text-sm text-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !phone.trim()}
                        className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {submitting && (
                            <span
                                aria-hidden
                                className="inline-block w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"
                            />
                        )}
                        Привязать
                    </button>
                </form>
            </div>
        </div>
    );
}
