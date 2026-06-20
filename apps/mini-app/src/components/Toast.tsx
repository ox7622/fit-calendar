import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ToastVariant = 'default' | 'error';

interface ToastMessage {
    id: number;
    message: string;
    variant: ToastVariant;
}

let nextId = 1;
const listeners = new Set<(toasts: ToastMessage[]) => void>();
let activeToasts: ToastMessage[] = [];

const TOAST_DURATION_MS = 3000;

function notify(): void {
    for (const listener of listeners) listener([...activeToasts]);
}

/**
 * Imperative API — fire from anywhere (event handlers, .then/.catch, etc.).
 * One global queue, multiple stack visually if fired in the same tick.
 * Auto-dismiss after 3s; no manual close button (matches the mini-app's lightweight feel).
 */
export function showToast(message: string, variant: ToastVariant = 'default'): void {
    const toast: ToastMessage = { id: nextId++, message, variant };
    activeToasts = [...activeToasts, toast];
    notify();
    window.setTimeout(() => {
        activeToasts = activeToasts.filter((t) => t.id !== toast.id);
        notify();
    }, TOAST_DURATION_MS);
}

/**
 * Mount once near the root of the app (AppShell does this). Renders nothing
 * when the queue is empty; subscribes to the imperative queue on mount.
 */
export function ToastViewport(): JSX.Element | null {
    const [toasts, setToasts] = useState<ToastMessage[]>(activeToasts);

    useEffect(() => {
        listeners.add(setToasts);
        return () => {
            listeners.delete(setToasts);
        };
    }, []);

    if (typeof document === 'undefined' || toasts.length === 0) return null;

    return createPortal(
        <div
            aria-live="polite"
            className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0) + 72px)' }}
        >
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    role="status"
                    className={`px-4 py-2.5 rounded-xl text-sm shadow-lg max-w-[90vw] animate-[fade-in_0.15s_ease-out] ${
                        toast.variant === 'error'
                            ? 'bg-error/10 text-error border border-error/20'
                            : 'bg-card text-foreground border border-border'
                    }`}
                >
                    {toast.message}
                </div>
            ))}
        </div>,
        document.body,
    );
}
