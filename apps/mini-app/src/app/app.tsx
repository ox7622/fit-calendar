import { AuthProvider, ThemeProvider } from './providers';
import { AppRouter } from './Router';

export function App(): JSX.Element {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
