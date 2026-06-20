import { create } from 'zustand';

import { taxonomyApi, type PublicTaxonomyItem } from '../api/taxonomy.api';

function toMap(items: PublicTaxonomyItem[]): Record<string, PublicTaxonomyItem> {
    return Object.fromEntries(items.map((item) => [item.key, item]));
}

interface TaxonomyState {
    difficultyLevels: PublicTaxonomyItem[];
    impactTypes: PublicTaxonomyItem[];
    /** key → item lookups for resolving labels/colours on class cards. */
    difficultyMap: Record<string, PublicTaxonomyItem>;
    impactMap: Record<string, PublicTaxonomyItem>;
    loaded: boolean;
    loading: boolean;
    /** Fetch once. Idempotent — repeat calls while loaded/in-flight are no-ops. */
    load: () => Promise<void>;
}

export const useTaxonomyStore = create<TaxonomyState>((set, get) => ({
    difficultyLevels: [],
    impactTypes: [],
    difficultyMap: {},
    impactMap: {},
    loaded: false,
    loading: false,

    load: async (): Promise<void> => {
        if (get().loaded || get().loading) return;
        set({ loading: true });
        try {
            const data = await taxonomyApi.get();
            set({
                difficultyLevels: data.difficultyLevels,
                impactTypes: data.impactTypes,
                difficultyMap: toMap(data.difficultyLevels),
                impactMap: toMap(data.impactTypes),
                loaded: true,
            });
        } catch {
            // Non-fatal: cards fall back to raw keys / slate until a later load succeeds.
        } finally {
            set({ loading: false });
        }
    },
}));
