import { ReactNode } from 'react';

import { LinkPhonePrompt } from '@/components';

import { useAuth } from '../providers/AuthProvider';

interface RequireLinkedCustomerProps {
    children: ReactNode;
    /** Subtitle for LinkPhonePrompt when the visitor has a Telegram identity but isn't linked yet. */
    linkPrompt?: string;
    /** Message for visitors browsing outside Telegram. */
    anonymousMessage?: string;
}

function LoadingScreen(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );
}

function NotInTelegramInline({ message }: { message: string }): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-6 text-center">
            <span role="img" aria-label="Mobile phone" className="text-5xl mb-3">
                📱
            </span>
            <h2 className="heading-2 mb-2">Откройте в Telegram</h2>
            <p className="text-body-secondary">{message}</p>
        </div>
    );
}

/**
 * Route-level gate: renders `children` only for a linked customer. Anonymous
 * visitors see a "Open in Telegram" hint; unlinked Telegram identities see
 * LinkPhonePrompt. Both fall back inside the AppShell so the bottom nav stays
 * available — visitors can keep browsing the public catalog.
 */
export function RequireLinkedCustomer({
    children,
    linkPrompt,
    anonymousMessage,
}: RequireLinkedCustomerProps): JSX.Element {
    const { status } = useAuth();

    if (status === 'loading') {
        return <LoadingScreen />;
    }

    if (status === 'linked') {
        return <>{children}</>;
    }

    if (status === 'anonymous') {
        return (
            <NotInTelegramInline message={anonymousMessage ?? 'Эта страница доступна после входа через Telegram.'} />
        );
    }

    return <LinkPhonePrompt subtitle={linkPrompt ?? 'Привяжите профиль, чтобы продолжить.'} />;
}
