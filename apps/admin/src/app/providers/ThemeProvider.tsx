import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type TTheme = 'light' | 'dark';

interface IThemeContext {
    theme: TTheme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<IThemeContext | undefined>(undefined);

const STORAGE_KEY = 'admin_theme';

function readStoredTheme(): TTheme | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
}

function systemTheme(): TTheme {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

/**
 * Admin theme. Dark is the design default (the `:root` palette); light is the
 * `.light` override in styles.css. We persist the admin's explicit choice to
 * localStorage; absent a stored choice we follow the OS preference (and keep
 * following it until they flip the toggle).
 */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
    const [theme, setTheme] = useState<TTheme>(() => readStoredTheme() ?? systemTheme());

    // True once the admin has a persisted choice — then the OS preference no
    // longer overrides them.
    const hasManualChoice = useRef(readStoredTheme() !== null);

    const toggleTheme = useCallback((): void => {
        hasManualChoice.current = true;
        setTheme((prev) => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    // Apply the theme class to <html>, with a brief transition.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('theme-transition');
        root.classList.toggle('light', theme === 'light');
        const timeout = setTimeout(() => root.classList.remove('theme-transition'), 300);
        return () => clearTimeout(timeout);
    }, [theme]);

    // Follow OS changes until the admin makes an explicit choice.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const onChange = (e: MediaQueryListEvent): void => {
            if (hasManualChoice.current) return;
            setTheme(e.matches ? 'light' : 'dark');
        };
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): IThemeContext {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
