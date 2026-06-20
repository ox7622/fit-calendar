import type { ReactNode } from 'react';

interface IOverlayProps {
    onClose: () => void;
    children: ReactNode;
    /** Class for the centered panel (the click-stopping inner box). */
    className?: string;
    /** Class for the full-screen backdrop — set z-index + bg here. */
    backdropClassName?: string;
    role?: string;
    'aria-modal'?: boolean;
    'aria-labelledby'?: string;
}

/**
 * Full-screen click-away backdrop with a centered panel. Clicking the backdrop
 * calls `onClose`; clicks inside the panel are stopped. Shared shell for modals
 * (z-50) and pop-over pickers that open above a modal (z-60).
 */
export function Overlay({
    onClose,
    children,
    className,
    backdropClassName = 'z-50 bg-black/50',
    ...panelProps
}: IOverlayProps) {
    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4 ${backdropClassName}`} onClick={onClose}>
            <div className={className} onClick={(e) => e.stopPropagation()} {...panelProps}>
                {children}
            </div>
        </div>
    );
}
