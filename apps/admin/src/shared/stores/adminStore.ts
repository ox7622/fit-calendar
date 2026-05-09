import { create } from 'zustand';

export interface AdminProfile {
    id: string;
    email: string;
    name: string;
}

interface AdminState {
    token: string | null;
    admin: AdminProfile | null;
    setAuth: (auth: { token: string; admin: AdminProfile }) => void;
    clearAuth: () => void;
}

const TOKEN_STORAGE_KEY = 'admin_token';
const USER_STORAGE_KEY = 'admin_user';

function hydrate(): { token: string | null; admin: AdminProfile | null } {
    if (typeof window === 'undefined') {
        return { token: null, admin: null };
    }
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawAdmin = window.localStorage.getItem(USER_STORAGE_KEY);

    let admin: AdminProfile | null = null;
    if (rawAdmin) {
        try {
            admin = JSON.parse(rawAdmin) as AdminProfile;
        } catch {
            // Corrupt cache — drop both keys to avoid an inconsistent state.
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.localStorage.removeItem(USER_STORAGE_KEY);
            return { token: null, admin: null };
        }
    }

    return { token, admin };
}

export const useAdminStore = create<AdminState>((set) => ({
    ...hydrate(),

    setAuth: ({ token, admin }) => {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(admin));
        set({ token, admin });
    },

    clearAuth: () => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(USER_STORAGE_KEY);
        set({ token: null, admin: null });
    },
}));
