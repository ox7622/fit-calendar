# 19. Monitoring

## 19.1 Logging (Pino)

```typescript
// logger.config.ts
import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: { colorize: process.env.NODE_ENV !== 'production' },
    },
    redact: ['req.headers.authorization', 'req.headers["x-telegram-init-data"]'],
});
```

## 19.2 Sentry Integration

```typescript
// main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
});
```

## 19.3 Health Checks

```typescript
// health.controller.ts
@Controller('health')
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }

    @Get('ready')
    async ready() {
        // Check database connection
        await this.dataSource.query('SELECT 1');
        return { status: 'ready' };
    }
}
```

---
