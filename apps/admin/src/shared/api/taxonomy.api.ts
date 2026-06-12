import type { TTaxonomyColor } from '@fitcalendar/shared';

import { adminApiClient } from './client';

/** One difficulty level or impact (load) type. Shared shape — see the API's
 *  TaxonomyItemDto. `key` is server-derived from the label and immutable. */
export interface ITaxonomyItem {
    id: string;
    key: string;
    label: string;
    color: TTaxonomyColor;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ITaxonomyCreatePayload {
    label: string;
    color: TTaxonomyColor;
    isActive?: boolean;
}

export type TTaxonomyUpdatePayload = Partial<ITaxonomyCreatePayload>;

export type TTaxonomyMoveDirection = 'up' | 'down';

/** Both taxonomy resources expose the identical CRUD surface (TaxonomyControllerBase),
 *  so we bind one client per base path. `move` returns the whole reordered list. */
function makeTaxonomyApi(basePath: string) {
    return {
        list: (): Promise<ITaxonomyItem[]> => adminApiClient.get<ITaxonomyItem[]>(basePath),

        create: (payload: ITaxonomyCreatePayload): Promise<ITaxonomyItem> =>
            adminApiClient.post<ITaxonomyItem>(basePath, payload),

        update: (id: string, payload: TTaxonomyUpdatePayload): Promise<ITaxonomyItem> =>
            adminApiClient.put<ITaxonomyItem>(`${basePath}/${id}`, payload),

        move: (id: string, direction: TTaxonomyMoveDirection): Promise<ITaxonomyItem[]> =>
            adminApiClient.put<ITaxonomyItem[]>(`${basePath}/${id}/move`, { direction }),

        remove: (id: string): Promise<void> => adminApiClient.delete<void>(`${basePath}/${id}`),
    };
}

export const adminDifficultyLevelsApi = makeTaxonomyApi('/admin/difficulty-levels');
export const adminImpactTypesApi = makeTaxonomyApi('/admin/impact-types');
