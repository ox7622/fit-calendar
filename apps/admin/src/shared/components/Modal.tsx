import { useId, type ReactNode } from 'react';

import { Overlay } from './Overlay';

interface IModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    /** Extra classes for the panel (e.g. `max-h-[90vh] overflow-y-auto`). */
    panelClassName?: string;
}

/** Standard centered modal: backdrop + titled panel. Built on {@link Overlay}. */
export function Modal({ title, onClose, children, panelClassName = '' }: IModalProps) {
    const titleId = useId();
    return (
        <Overlay
            onClose={onClose}
            role="dialog"
            aria-modal
            aria-labelledby={titleId}
            className={`w-full max-w-md rounded-lg bg-background p-6 shadow-lg ${panelClassName}`}
        >
            <h3 id={titleId} className="heading-3 mb-4">
                {title}
            </h3>
            {children}
        </Overlay>
    );
}
