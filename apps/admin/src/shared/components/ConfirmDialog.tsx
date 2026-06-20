import { useState, type ReactNode } from 'react';

import { Modal } from './Modal';

interface IConfirmDialogProps {
    title: string;
    message: ReactNode;
    confirmLabel?: string;
    /** Destructive styling for the confirm button (delete/cancel actions). */
    danger?: boolean;
    /** When set, render a checkbox (default checked) with this label; its value
     *  is returned to the caller as `notify`. */
    notifyLabel?: string;
    onConfirm: (notify: boolean) => void;
    onClose: () => void;
}

/** One-shot confirm modal built on the shared Modal. */
export function ConfirmDialog({
    title,
    message,
    confirmLabel = 'Продолжить',
    danger = false,
    notifyLabel,
    onConfirm,
    onClose,
}: IConfirmDialogProps): JSX.Element {
    const [notify, setNotify] = useState(true);
    return (
        <Modal title={title} onClose={onClose}>
            <div className="text-body mb-4">{message}</div>
            {notifyLabel && (
                <label className="text-body mb-4 flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={notify}
                        onChange={(e) => setNotify(e.target.checked)}
                        className="h-4 w-4"
                    />
                    {notifyLabel}
                </label>
            )}
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
                    onClick={() => onConfirm(notify)}
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
    /** Show a "notify users" checkbox with this label. */
    notifyToggle?: { label: string };
}

export interface IConfirmResult {
    confirmed: boolean;
    /** Checkbox state; `true` when no toggle was shown or on cancel. */
    notify: boolean;
}

/**
 * Promise-based confirm. Usage:
 *   const { confirm, dialog } = useConfirm();
 *   const { confirmed, notify } = await confirm({ title, message });
 *   if (!confirmed) return;
 *   ...render {dialog} once in the component tree.
 */
export function useConfirm(): {
    confirm: (req: IConfirmRequest) => Promise<IConfirmResult>;
    dialog: JSX.Element | null;
} {
    const [state, setState] = useState<{ req: IConfirmRequest; resolve: (r: IConfirmResult) => void } | null>(null);

    const confirm = (req: IConfirmRequest): Promise<IConfirmResult> =>
        new Promise<IConfirmResult>((resolve) => setState({ req, resolve }));

    const settle = (result: IConfirmResult): void => {
        state?.resolve(result);
        setState(null);
    };

    const dialog = state ? (
        <ConfirmDialog
            title={state.req.title}
            message={state.req.message}
            confirmLabel={state.req.confirmLabel}
            danger={state.req.danger}
            notifyLabel={state.req.notifyToggle?.label}
            onConfirm={(notify) => settle({ confirmed: true, notify })}
            onClose={() => settle({ confirmed: false, notify: true })}
        />
    ) : null;

    return { confirm, dialog };
}
