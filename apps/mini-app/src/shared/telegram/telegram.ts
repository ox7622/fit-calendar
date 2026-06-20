import WebApp from '@twa-dev/sdk';

/**
 * Telegram WebApp SDK wrapper
 * Provides type-safe access to Telegram Mini App features
 */

export type ColorScheme = 'dark' | 'light';

/**
 * Initialize the Telegram Mini App
 * Should be called once on app startup
 */
export function initTelegramApp(): void {
    // Signal that the app is ready to be displayed
    WebApp.ready();

    // Expand to use full screen height
    WebApp.expand();
}

/**
 * Get the initData string for API authentication
 * This is used to validate the user on the backend
 */
export function getInitData(): string {
    return WebApp.initData;
}

/**
 * Get the parsed initData object (unsafe - not validated)
 * Use for display purposes only, validate on backend
 */
export function getInitDataUnsafe(): typeof WebApp.initDataUnsafe {
    return WebApp.initDataUnsafe;
}

/**
 * Get the current color scheme
 */
export function getColorScheme(): ColorScheme {
    return WebApp.colorScheme;
}

/**
 * Subscribe to theme changes
 */
export function onThemeChanged(callback: () => void): void {
    WebApp.onEvent('themeChanged', callback);
}

/**
 * Unsubscribe from theme changes
 */
export function offThemeChanged(callback: () => void): void {
    WebApp.offEvent('themeChanged', callback);
}

/**
 * Get theme parameters from Telegram
 */
export function getThemeParams(): typeof WebApp.themeParams {
    return WebApp.themeParams;
}

/**
 * Trigger haptic feedback
 */
export const haptic = {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void => {
        WebApp.HapticFeedback.impactOccurred(style);
    },
    notificationOccurred: (type: 'error' | 'success' | 'warning'): void => {
        WebApp.HapticFeedback.notificationOccurred(type);
    },
    selectionChanged: (): void => {
        WebApp.HapticFeedback.selectionChanged();
    },
};

/**
 * Close the Mini App
 */
export function closeMiniApp(): void {
    WebApp.close();
}

/**
 * Check if running inside Telegram
 */
export function isInTelegram(): boolean {
    return Boolean(WebApp.initData);
}

/**
 * Get the Telegram user info (unsafe - not validated)
 */
export function getTelegramUser(): typeof WebApp.initDataUnsafe.user {
    return WebApp.initDataUnsafe.user;
}

/**
 * Get the platform (ios, android, web, etc.)
 */
export function getPlatform(): string {
    return WebApp.platform;
}

// Re-export WebApp for advanced usage
export { WebApp };
