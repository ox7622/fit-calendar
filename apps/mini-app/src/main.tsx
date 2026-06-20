import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
import { initTelegramApp } from './shared/telegram';
import './styles.css';

// Sentry init: gated on VITE_SENTRY_DSN_MINI so dev/CI without a DSN no-ops.
// Sample rates are intentionally conservative — bump on incident.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN_MINI;
if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
        release: import.meta.env.VITE_SENTRY_RELEASE,
        integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
    });
}

// Initialize Telegram Mini App
initTelegramApp();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
