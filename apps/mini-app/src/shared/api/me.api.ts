import type { Customer, TelegramIdentity } from '@/shared/stores';

import { apiClient } from './client';

export type MeResponse = { linked: true; customer: Customer } | { linked: false; telegramIdentity: TelegramIdentity };

export type LinkPhoneErrorCode = 'INVALID_PHONE_FORMAT' | 'PHONE_NOT_FOUND' | 'PHONE_ALREADY_LINKED_TO_OTHER';

export const meApi = {
    get: (): Promise<MeResponse> => apiClient.get<MeResponse>('/me'),

    linkPhone: (phone: string): Promise<Customer> => apiClient.post<Customer>('/me/link-phone', { phone }),
};
