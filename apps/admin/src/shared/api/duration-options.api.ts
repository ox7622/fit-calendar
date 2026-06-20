import { adminApiClient } from './client';
import type { TTaxonomyMoveDirection } from './taxonomy.api';

export { DURATION_OPTION_MAX_MINUTES, DURATION_OPTION_MIN_MINUTES } from '@fitcalendar/shared';

export interface IDurationOption {
    id: string;
    valueMinutes: number;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IDurationOptionCreatePayload {
    valueMinutes: number;
    isActive?: boolean;
}

export type TDurationOptionUpdatePayload = Partial<IDurationOptionCreatePayload>;

const BASE = '/admin/duration-options';

export const adminDurationOptionsApi = {
    list: (): Promise<IDurationOption[]> => adminApiClient.get<IDurationOption[]>(BASE),

    create: (payload: IDurationOptionCreatePayload): Promise<IDurationOption> =>
        adminApiClient.post<IDurationOption>(BASE, payload),

    update: (id: string, payload: TDurationOptionUpdatePayload): Promise<IDurationOption> =>
        adminApiClient.put<IDurationOption>(`${BASE}/${id}`, payload),

    move: (id: string, direction: TTaxonomyMoveDirection): Promise<IDurationOption[]> =>
        adminApiClient.put<IDurationOption[]>(`${BASE}/${id}/move`, { direction }),

    remove: (id: string): Promise<void> => adminApiClient.delete<void>(`${BASE}/${id}`),
};
