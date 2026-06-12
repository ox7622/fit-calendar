import { useEffect } from 'react';

import { useTaxonomyStore } from '@/shared/stores';

import { AuthProvider, ThemeProvider } from './providers';
import { AppRouter } from './Router';

export function App(): JSX.Element {
    // Difficulty levels + impact types (labels/colours) are admin-managed; fetch
    // them once at boot so class cards and filters render from the DB taxonomy.
    const loadTaxonomy = useTaxonomyStore((s) => s.load);
    useEffect(() => {
        void loadTaxonomy();
    }, [loadTaxonomy]);

    return (
        <ThemeProvider>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
