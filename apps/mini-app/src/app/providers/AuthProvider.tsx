import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

import { ApiError, meApi } from '@/shared/api';
import { useCustomerStore, useRemindersStore } from '@/shared/stores';
import { isInTelegram } from '@/shared/telegram';

/**
 * Four-state auth flow (Story 7.7 — anonymous browsing).
 *
 *   loading     → initial probe to /me hasn't resolved yet
 *   anonymous   → opened outside Telegram (no initData); only public catalog
 *                 endpoints are usable. Private pages render LinkPhonePrompt.
 *   unlinked    → valid Telegram identity but no matching customer; public
 *                 catalog still browsable, private pages prompt for phone.
 *   linked      → fully authenticated customer.
 *
 * AuthProvider no longer gates the route tree — it always renders `children`.
 * Per-route gating lives in `<RequireLinkedCustomer>`.
 */
export type AuthStatus = 'loading' | 'anonymous' | 'unlinked' | 'linked';

interface AuthContextValue {
    status: AuthStatus;
    isInTelegram: boolean;
    retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within <AuthProvider>');
    }
    return ctx;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
    const { setLinked, setUnlinked, setLoading, setError, reset } = useCustomerStore();
    const loadReminders = useRemindersStore((s) => s.loadReminders);
    const remindersHasLoaded = useRemindersStore((s) => s.hasLoaded);
    const [status, setStatus] = useState<AuthStatus>('loading');
    const inTg = isInTelegram();

    const authenticate = async (): Promise<void> => {
        // Outside Telegram: serve the public catalog. Skip /me entirely
        // because TelegramAuthGuard would 401 without initData anyway.
        if (!inTg) {
            reset();
            setLoading(false);
            setStatus('anonymous');
            return;
        }

        setLoading(true);
        setError(null);
        setStatus('loading');

        try {
            const me = await meApi.get();
            if (me.linked) {
                setLinked(me.customer);
                setStatus('linked');
                if (!remindersHasLoaded) {
                    loadReminders().catch(() => {
                        // Surfaced via store; don't crash auth.
                    });
                }
            } else {
                setUnlinked(me.telegramIdentity);
                setStatus('unlinked');
            }
        } catch (err) {
            // Any failure on /me falls back to anonymous so the public catalog
            // still works. Auth-required pages will show LinkPhonePrompt via
            // <RequireLinkedCustomer>, where the user can retry the link.
            reset();
            setLoading(false);
            setStatus('anonymous');
            if (err instanceof ApiError) {
                setError(err.isAuthError() ? 'Telegram authentication failed.' : 'Authentication unavailable.');
            } else {
                setError('Network error. Please check your connection.');
            }
        }
    };

    useEffect(() => {
        authenticate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AuthContext.Provider value={{ status, isInTelegram: inTg, retry: authenticate }}>
            {children}
        </AuthContext.Provider>
    );
}
