import { apiClient } from './client';

/** One active difficulty level / impact type from the public taxonomy.
 *  Mirrors the API's PublicTaxonomyItemDto. */
export interface PublicTaxonomyItem {
    key: string;
    label: string;
    color: string;
    sortOrder: number;
}

export interface PublicTaxonomy {
    difficultyLevels: PublicTaxonomyItem[];
    impactTypes: PublicTaxonomyItem[];
}

export const taxonomyApi = {
    get: (): Promise<PublicTaxonomy> => apiClient.get<PublicTaxonomy>('/taxonomy'),
};
