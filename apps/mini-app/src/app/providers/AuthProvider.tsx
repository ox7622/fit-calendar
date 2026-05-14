import { ReactNode, useEffect } from 'react';

import { LinkPhonePrompt } from '@/components';
import { ApiError, meApi } from '@/shared/api';
import { useCustomerStore } from '@/shared/stores';
import { isInTelegram } from '@/shared/telegram';

interface AuthProviderProps {
    children: ReactNode;
}

function LoadingScreen(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
    );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background px-4">
            <div className="text-error text-6xl mb-4">!</div>
            <h1 className="heading-2 mb-2 text-center">Authentication Failed</h1>
            <p className="text-body-secondary text-center mb-6">{message}</p>
            <button
                onClick={onRetry}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
                Try Again
            </button>
        </div>
    );
}

function NotInTelegramScreen(): JSX.Element {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background px-4">
            <span role="img" aria-label="Mobile phone" className="text-6xl mb-4">
                📱
            </span>
            <h1 className="heading-2 mb-2 text-center">Open in Telegram</h1>
            <p className="text-body-secondary text-center">This app must be opened from the Telegram bot menu.</p>
        </div>
    );
}

/**
 * Story 7.2 — three-state auth flow.
 *
 *   anonymous (not in Telegram)  → NotInTelegramScreen
 *   Telegram-only (unlinked)     → LinkPhonePrompt (renders children when linked)
 *   linked customer              → children
 *
 * Anonymous browsing across the public catalog (schedule, coaches, club info,
 * plans) was deferred: the existing brief still requires Telegram for entry,
 * and there's no anonymous flow for "open the app in a regular browser" yet.
 * The linked/unlinked split here is the seed for that future flow.
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
    const { linked, isLoading, error, setLinked, setUnlinked, setLoading, setError } = useCustomerStore();

    const authenticate = async (): Promise<void> => {
        if (!isInTelegram()) {
            setLoading(false);
            setError('Not running inside Telegram');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const me = await meApi.get();
            if (me.linked) {
                setLinked(me.customer);
            } else {
                setUnlinked(me.telegramIdentity);
            }
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.isAuthError()) {
                    setError('Authentication failed. Please reopen the app from Telegram.');
                } else if (err.isServerError()) {
                    setError('Server error. Please try again later.');
                } else {
                    setError('Unable to authenticate. Please try again.');
                }
            } else {
                setError('Network error. Please check your connection.');
            }
        }
    };

    useEffect(() => {
        authenticate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!isInTelegram() && !isLoading && error) {
        return <NotInTelegramScreen />;
    }

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (error) {
        return <ErrorScreen message={error} onRetry={authenticate} />;
    }

    if (linked === false) {
        return <LinkPhonePrompt subtitle="Введите номер, указанный при регистрации в клубе." />;
    }

    if (linked === true) {
        return children as JSX.Element;
    }

    return <LoadingScreen />;
}
