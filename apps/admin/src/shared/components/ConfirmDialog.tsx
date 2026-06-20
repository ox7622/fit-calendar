import { useState, type ReactNode } from 'react';

import { Modal } from './Modal';

interface IConfirmDialogProps {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** Destructive styling for the confirm button (delete/cancel actions). */
    danger?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** One-shot confirm modal built on the shared Modal. */
export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Продолжить',
    danger = false,
    onConfirm,
    onClose,
}: IConfirmDialogProps): JSX.Element {
    return (
        <Modal title={title} onClose={onClose}>
            <div className="text-body mb-4">{message}</div>
            <div className="flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md border border-border px-4 py-2 hover:bg-muted"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    className={
                        danger
                            ? 'rounded-md bg-destructive px-4 py-2 font-medium text-white hover:opacity-90'
                            : 'rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-accent-active'
                    }
                >
                    {confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

interface IConfirmRequest {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    danger?: boolean;
}

/**
 * Promise-based confirm. Usage:
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title, message }))) return;
 *   ...render {dialog} once in the component tree.
 */
export function useConfirm(): {
    confirm: (req: IConfirmRequest) => Promise<boolean>;
    dialog: JSX.Element | null;
} {
    const [state, setState] = useState<{ req: IConfirmRequest; resolve: (ok: boolean) => void } | null>(null);

    const confirm = (req: IConfirmRequest): Promise<boolean> =>
        new Promise<boolean>((resolve) => setState({ req, resolve }));

    const settle = (ok: boolean): void => {
        state?.resolve(ok);
        setState(null);
    };

    const dialog = state ? (
        <ConfirmDialog
            title={state.req.title}
            message={state.req.message}
            confirmLabel={state.req.confirmLabel}
            danger={state.req.danger}
            onConfirm={() => settle(true)}
            onClose={() => settle(false)}
        />
    ) : null;

    return { confirm, dialog };
}
