import { ReactNode } from 'react';

import { BottomNav } from './BottomNav';

interface AppShellProps {
    children: ReactNode;
}

/**
 * AppShell provides the main layout for the Mini App.
 * Just the content area + bottom navigation — there is no top bar; the theme
 * toggle lives in the Schedule header and the profile is a bottom-nav tab.
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
