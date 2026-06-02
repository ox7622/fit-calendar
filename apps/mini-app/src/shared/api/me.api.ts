import type { Customer, TelegramIdentity } from '@/shared/stores';

import { apiClient } from './client';

export type MeResponse = { linked: true; customer: Customer } | { linked: false; telegramIdentity: TelegramIdentity };

export type LinkPhoneErrorCode = 'INVALID_PHONE_FORMAT' | 'PHONE_NOT_FOUND' | 'PHONE_ALREADY_LINKED_TO_OTHER';

/**
 * Allowed values for `reminderMinutes`. Mirrors the backend's `REMINDER_MINUTES_OPTIONS`
 * in `apps/api/src/modules/customer/customer.constants.ts`. Kept as a duplicate
 * because the constant is too small to justify wiring up cross-package sharing.
 */
export const REMINDER_MINUTES_OPTIONS = [15, 30, 60, 120] as const;
export type TReminderMinutes = (typeof REMINDER_MINUTES_OPTIONS)[number];

export interface SettingsResponse {
    reminderMinutes: number;
}

export const meApi = {
    get: (): Promise<MeResponse> => apiClient.get<MeResponse>('/me'),

    linkPhone: (phone: string): Promise<Customer> => apiClient.post<Customer>('/me/link-phone', { phone }),

    getSettings: (): Promise<SettingsResponse> => apiClient.get<SettingsResponse>('/me/settings'),

    updateSettings: (reminderMinutes: TReminderMinutes): Promise<SettingsResponse> =>
        apiClient.put<SettingsResponse>('/me/settings', { reminderMinutes }),
};
