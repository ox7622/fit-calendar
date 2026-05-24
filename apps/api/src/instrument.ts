/**
 * Sentry instrumentation — imported as the FIRST line of main.ts so it loads
 * before any module we want to auto-instrument. If `SENTRY_DSN` is unset
 * (local dev, CI), `Sentry.init` is a no-op and the rest of the app boots
 * normally.
 *
 * Per @sentry/nestjs docs: this MUST live in its own file and be imported at
 * the very top of the entrypoint. Inlining it would defeat the
 * import-hoisting / auto-instrumentation that NestJS relies on.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV ?? 'development',
        // 10% transaction sampling in prod is plenty for the MVP traffic profile.
        // Tune up to 1.0 temporarily when debugging a regression.
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Don't ship Telegram bot tokens or admin JWTs to Sentry by accident.
        sendDefaultPii: false,
    });
}
