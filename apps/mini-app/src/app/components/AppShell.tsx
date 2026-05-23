import { ReactNode } from 'react';

import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

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
            {/* Top bar — minimal, just hosts the profile shortcut (Story 7.4) */}
            <header className="flex items-center justify-end px-3 py-2 border-b border-border bg-background">
                <Link
                    to="/me"
                    aria-label="Профиль"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-body-secondary hover:bg-muted"
                >
                    <User className="h-5 w-5" />
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden">{children}</main>

            {/* Bottom Navigation */}
            <BottomNav />
        </div>
    );
}
