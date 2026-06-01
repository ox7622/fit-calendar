import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { getColorScheme, onThemeChanged, offThemeChanged, isInTelegram, ColorScheme } from '@/shared/telegram';

interface ThemeContextType {
    theme: ColorScheme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * ThemeProvider syncs the app theme with Telegram's colorScheme
 * - Reads initial theme from Telegram WebApp SDK
 * - Listens for theme changes from Telegram
 * - Falls back to system preference when not in Telegram
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
    const [theme, setTheme] = useState<ColorScheme>(() => {
        if (isInTelegram()) {
            return getColorScheme();
        }
        // Fallback to system preference
        if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    });

    // Once the user flips the theme manually, stop letting Telegram's / the
    // system's colorScheme override their choice for the rest of the session.
    const manualOverride = useRef(false);

    const handleThemeChange = useCallback((): void => {
        if (manualOverride.current) return;
        setTheme(getColorScheme());
    }, []);

    const toggleTheme = useCallback((): void => {
        manualOverride.current = true;
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    }, []);

    // Apply theme class to document
    useEffect(() => {
        const root = document.documentElement;

        // Add transition class for smooth animation
        root.classList.add('theme-transition');

        if (theme === 'light') {
            root.classList.add('light');
        } else {
            root.classList.remove('light');
        }

        // Remove transition class after animation completes
        const timeout = setTimeout(() => {
            root.classList.remove('theme-transition');
        }, 300);

        return (): void => {
            clearTimeout(timeout);
        };
    }, [theme]);

    // Listen for Telegram theme changes
    useEffect(() => {
        if (!isInTelegram()) {
            // Listen to system preference changes when not in Telegram
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            const handleSystemChange = (e: MediaQueryListEvent): void => {
                if (manualOverride.current) return;
                setTheme(e.matches ? 'light' : 'dark');
            };
            mediaQuery.addEventListener('change', handleSystemChange);
            return (): void => {
                mediaQuery.removeEventListener('change', handleSystemChange);
            };
        }

        // Subscribe to Telegram theme changes
        onThemeChanged(handleThemeChange);

        return (): void => {
            offThemeChanged(handleThemeChange);
        };
    }, [handleThemeChange]);

    return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access current theme
 */
export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
