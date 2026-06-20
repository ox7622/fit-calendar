import { create } from 'zustand';

export interface IAdminProfile {
    id: string;
    login: string;
    name: string;
}

interface IAdminState {
    token: string | null;
    admin: IAdminProfile | null;
    setAuth: (auth: { token: string; admin: IAdminProfile }) => void;
    clearAuth: () => void;
}

const TOKEN_STORAGE_KEY = 'admin_token';
const USER_STORAGE_KEY = 'admin_user';

function hydrate(): { token: string | null; admin: IAdminProfile | null } {
    if (typeof window === 'undefined') {
        return { token: null, admin: null };
    }
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    const rawAdmin = window.localStorage.getItem(USER_STORAGE_KEY);

    let admin: IAdminProfile | null = null;
    if (rawAdmin) {
        try {
            admin = JSON.parse(rawAdmin) as IAdminProfile;
        } catch {
            // Corrupt cache — drop both keys to avoid an inconsistent state.
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            window.localStorage.removeItem(USER_STORAGE_KEY);
            return { token: null, admin: null };
        }
    }

    return { token, admin };
}

export const useAdminStore = create<IAdminState>((set) => ({
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
