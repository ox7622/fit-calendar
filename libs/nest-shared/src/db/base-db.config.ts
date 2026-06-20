import type { LoggerOptions } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

const DEFAULT_ENV_LOGGING = 'all';

// TODO: конвертировать ELogLevel в LogLevel и брать из NX_APP_LOG_LEVEL
function prepareLogging(envValue?: string): LoggerOptions {
    const value = envValue ?? DEFAULT_ENV_LOGGING;

    if (/^(true|false)$/i.test(value)) {
        return Boolean(value.toLowerCase() === 'true');
    } else if (value === 'all') {
        return value;
    } else {
        return value.split(',') as LoggerOptions;
    }
}

export const baseDbConfig = (): PostgresConnectionOptions => ({
    type: 'postgres',
    database: process.env.NX_DB_NAME,
    username: process.env.NX_DB_USER,
    password: process.env.NX_DB_PASS,
    host: process.env.NX_DB_HOST,
    port: Number(process.env.NX_DB_PORT),
    schema: process.env.NX_DB_SCHEMA ?? 'public',
    // Managed Postgres reached over the public internet (Neon, Render, etc.)
    // requires TLS. Enable with NX_DB_SSL=true. Left off for local/private-network
    // Postgres (Docker, Railway's internal network) where TLS isn't needed.
    ssl: process.env.NX_DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    logging: prepareLogging(process.env.NX_DB_LOGGING),
    maxQueryExecutionTime: 2000,
    // Pool + per-statement safety nets. Defaults sized for a single-instance
    // API on a small Postgres; bump `max` proportionally when scaling out.
    //  - `max`: connection pool ceiling. Above this, callers queue.
    //  - `statement_timeout`: server-side kill switch for runaway queries
    //    (30s — anything slower is a bug or N+1).
    //  - `idle_in_transaction_session_timeout`: kills sessions that BEGIN
    //    and forget to COMMIT/ROLLBACK so they can't pin a row lock forever.
    extra: {
        max: Number(process.env.NX_DB_POOL_MAX ?? 10),
        statement_timeout: Number(process.env.NX_DB_STATEMENT_TIMEOUT_MS ?? 30_000),
        idle_in_transaction_session_timeout: Number(process.env.NX_DB_IDLE_TX_TIMEOUT_MS ?? 60_000),
    },
    migrations: [],
    entities: [], // переопределяется сервисом
});
