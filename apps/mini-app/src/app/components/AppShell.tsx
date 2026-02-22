import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

/**
 * AppShell provides the main layout for the Mini App
 * Includes the bottom navigation and content area
 */
export function AppShell({ children }: AppShellProps): JSX.Element {
    return (
        <div className="flex flex-col h-screen max-w-[430px] mx-auto bg-background">
            {/* Main Content */}
            <main className="flex-1 overflow-hidden">{children}</main>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
