import { useState } from 'react';

import { Copy } from 'lucide-react';

export function buildSetPasswordUrl(token: string): string {
    const path = `${import.meta.env.BASE_URL}set-password?token=${encodeURIComponent(token)}`;
    return new URL(path, window.location.origin).toString();
}

interface IIssuedTokenLinkCardProps {
    forEmail: string;
    token: string;
    expiresAt: string;
    /** Optional context shown in the lede (e.g. "новый аккаунт", "переактивация"). */
    actionLabel?: string;
    /** If provided, renders a "Закрыть" button that calls this. */
    onDismiss?: () => void;
}

export function IssuedTokenLinkCard({ forEmail, token, expiresAt, actionLabel, onDismiss }: IIssuedTokenLinkCardProps) {
    const [copied, setCopied] = useState(false);
    const url = buildSetPasswordUrl(token);

    const onCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div className="rounded border border-primary/40 bg-primary/5 p-4 space-y-2">
            <p className="text-sm">
                Ссылка для <span className="font-medium">{forEmail}</span>
                {actionLabel ? <> ({actionLabel})</> : null} создана. Передайте её получателю — открывается один раз,
                действует до {new Date(expiresAt).toLocaleString('ru-RU')}.
            </p>
            <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{url}</code>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                >
                    <Copy className="h-3 w-3" /> {copied ? 'Скопировано' : 'Копировать'}
                </button>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                    >
                        Закрыть
                    </button>
                )}
            </div>
        </div>
    );
}
