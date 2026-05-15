import { apiClient } from './client';

export interface Reminder {
    id: string;
    scheduleEntryId: string;
    notifyAt: string;
    status: 'pending' | 'sent' | 'failed';
}

export const remindersApi = {
    subscribe: (scheduleEntryId: string): Promise<Reminder> =>
        apiClient.post<Reminder>('/reminders', { scheduleEntryId }),

    unsubscribe: (reminderId: string): Promise<void> => apiClient.delete<void>(`/reminders/${reminderId}`),
};
