import { create } from 'zustand';

/**
 * Mirrors apps/api/src/modules/customer/dto/customer-response.dto.ts.
 */
export interface Customer {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    email: string | null;
    telegramId: string | null;
    telegramUsername: string | null;
    isActive: boolean;
    notes: string | null;
    reminderMinutes: number;
    createdAt: string;
    updatedAt: string;
}

export interface TelegramIdentity {
    firstName: string;
    username?: string | null;
}

interface CustomerState {
    /**
     * Discriminator: true → caller is a recognized customer; false → caller
     * has a valid Telegram identity but no matching customer record.
     * `null` while loading.
     */
    linked: boolean | null;
    customer: Customer | null;
    telegramIdentity: TelegramIdentity | null;
    isLoading: boolean;
    error: string | null;
    setLinked: (customer: Customer) => void;
    setUnlinked: (identity: TelegramIdentity) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    /**
     * Patch `customer.reminderMinutes` in-place (Story 5.2). Used by the
     * SettingsSheet after a successful save so subsequent reminder subscriptions
     * (Story 5.1) compute `notifyAt` from the new preference.
     */
    setReminderMinutes: (minutes: number) => void;
    reset: () => void;
}

const initialState = {
    linked: null,
    customer: null,
    telegramIdentity: null,
    isLoading: true,
    error: null,
} satisfies Omit<
    CustomerState,
    'setLinked' | 'setUnlinked' | 'setLoading' | 'setError' | 'setReminderMinutes' | 'reset'
>;

export const useCustomerStore = create<CustomerState>((set) => ({
    ...initialState,

    setLinked: (customer) =>
        set({
            linked: true,
            customer,
            telegramIdentity: null,
            isLoading: false,
            error: null,
        }),

    setUnlinked: (identity) =>
        set({
            linked: false,
            customer: null,
            telegramIdentity: identity,
            isLoading: false,
            error: null,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) =>
        set({
            error,
            isLoading: false,
        }),

    setReminderMinutes: (minutes) =>
        set((state) => ({
            customer: state.customer ? { ...state.customer, reminderMinutes: minutes } : null,
        })),

    reset: () => set(initialState),
}));
