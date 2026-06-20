import { ThemeProvider } from './providers/ThemeProvider';
import { AppRouter } from './Router';

export function App() {
    return (
        <ThemeProvider>
            <AppRouter />
        </ThemeProvider>
    );
}

export default App;
