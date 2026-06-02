import type { FormEvent } from 'react';
import { useState } from 'react';

import type { IAdminCustomer, ICustomerFormPayload } from '@/shared/api';

const INPUT_CLASS =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60';

/** Lightweight client-side normalizer for the inline preview only. Server is source of truth. */
function previewNormalize(input: string): string | null {
    if (!input) return null;
    const digits = input.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
    if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
    if (digits.length === 10) return `+7${digits}`;
    return null;
}

interface ICustomerFormProps {
    initialValues?: Partial<IAdminCustomer>;
    submitLabel: string;
    isEditing?: boolean;
    onSubmit: (payload: ICustomerFormPayload) => Promise<void>;
    onCancel?: () => void;
    onUnlink?: () => Promise<void>;
}

interface ICustomerFormState {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    isActive: boolean;
    notes: string;
}

function toState(values?: Partial<IAdminCustomer>): ICustomerFormState {
    return {
        firstName: values?.firstName ?? '',
        lastName: values?.lastName ?? '',
        phone: values?.phone ?? '',
        email: values?.email ?? '',
        isActive: values?.isActive ?? true,
        notes: values?.notes ?? '',
    };
}

export function CustomerForm({
    initialValues,
    submitLabel,
    isEditing = false,
    onSubmit,
    onCancel,
    onUnlink,
}: ICustomerFormProps) {
    const [state, setState] = useState<ICustomerFormState>(() => toState(initialValues));
    const [submitting, setSubmitting] = useState(false);
    const [unlinking, setUnlinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizedPreview = previewNormalize(state.phone);

    const update = <K extends keyof ICustomerFormState>(key: K, value: ICustomerFormState[K]): void => {
        setState((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (submitting) return;
        setError(null);

        if (!state.firstName.trim()) {
            setError('Введите имя');
            return;
        }
        if (!state.phone.trim()) {
            setError('Введите номер');
            return;
        }

        setSubmitting(true);
        try {
            await onSubmit({
                firstName: state.firstName.trim(),
                lastName: state.lastName.trim() || null,
                phone: state.phone.trim(),
                email: state.email.trim() || null,
                isActive: state.isActive,
                notes: state.notes.trim() || null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Не удалось сохранить клиента');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUnlink = async (): Promise<void> => {
        if (!onUnlink || unlinking) return;
        if (!window.confirm('Отвязать Telegram от профиля?')) return;
        setUnlinking(true);
        try {
            await onUnlink();
        } finally {
            setUnlinking(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl" noValidate>
            <div className="grid grid-cols-2 gap-3">
                <Field id="firstName" label="Имя">
                    <input
                        id="firstName"
                        type="text"
                        value={state.firstName}
                        onChange={(e) => update('firstName', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                        required
                    />
                </Field>
                <Field id="lastName" label="Фамилия">
                    <input
                        id="lastName"
                        type="text"
                        value={state.lastName}
                        onChange={(e) => update('lastName', e.target.value)}
                        className={INPUT_CLASS}
                        disabled={submitting}
                    />
                </Field>
            </div>

            <Field id="phone" label="Телефон">
                <input
                    id="phone"
                    type="tel"
                    value={state.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="+7 999 555 12 34"
                    disabled={submitting}
                    required
                />
                {state.phone && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Нормализованный вид:{' '}
                        {normalizedPreview ? (
                            <code className="text-foreground">{normalizedPreview}</code>
                        ) : (
                            <span className="text-destructive">не распознан</span>
                        )}
                    </p>
                )}
            </Field>

            <Field id="email" label="Email">
                <input
                    id="email"
                    type="email"
                    value={state.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={INPUT_CLASS}
                    disabled={submitting}
                />
            </Field>

            {isEditing && initialValues?.telegramId && (
                <div className="rounded-md border border-border p-3 space-y-2">
                    <p className="text-sm font-medium">Telegram</p>
                    <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                            ID: <code className="text-foreground">{initialValues.telegramId}</code>
                        </div>
                        {initialValues.telegramUsername && (
                            <div>
                                Username: <code className="text-foreground">@{initialValues.telegramUsername}</code>
                            </div>
                        )}
                    </div>
                    {onUnlink && (
                        <button
                            type="button"
                            onClick={handleUnlink}
                            disabled={unlinking}
                            className="text-sm text-destructive hover:underline disabled:opacity-50"
                        >
                            {unlinking ? 'Отвязка...' : 'Отвязать Telegram'}
                        </button>
                    )}
                </div>
            )}

            <Field id="notes" label="Заметки">
                <textarea
                    id="notes"
                    value={state.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    rows={3}
                    className={INPUT_CLASS}
                    disabled={submitting}
                />
            </Field>

            <label className="flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={state.isActive}
                    onChange={(e) => update('isActive', e.target.checked)}
                    disabled={submitting}
                    className="h-4 w-4 rounded border-input"
                />
                Активный
            </label>

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <div className="flex gap-2 pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-medium hover:bg-accent-active disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {submitting ? 'Сохранение...' : submitLabel}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={submitting}
                        className="rounded-md border border-border px-4 py-2 hover:bg-muted"
                    >
                        Отмена
                    </button>
                )}
            </div>
        </form>
    );
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-body-secondary">
                {label}
            </label>
            {children}
        </div>
    );
}
