import { StrictMode } from 'react';

import * as Sentry from '@sentry/react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './app/app';

import './styles.css';

// Sentry init: gated on VITE_SENTRY_DSN_ADMIN so dev/CI without a DSN
// no-ops. Sample rates are intentionally conservative — bump on incident.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN_ADMIN;
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

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
