import { create } from 'zustand';

export interface User {
    id: string;
    telegramId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    reminderMinutes: number;
    createdAt: string;
    updatedAt: string;
}

interface UserState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    setUser: (user: User) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

const initialState = {
    user: null,
    isLoading: true,
    error: null,
};

export const useUserStore = create<UserState>((set) => ({
    ...initialState,

    setUser: (user) =>
        set({
            user,
            isLoading: false,
            error: null,
        }),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) =>
        set({
            error,
            isLoading: false,
        }),

    reset: () => set(initialState),
}));
