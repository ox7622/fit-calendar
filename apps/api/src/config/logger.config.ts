import type { Params } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const REQUEST_ID_HEADER = 'x-request-id';

export const loggerConfig: Params = {
    pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
            process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
        redact: ['req.headers.authorization', 'req.headers["x-telegram-init-data"]'],
        /**
         * Honor the upstream X-Request-Id (so a reverse proxy / load balancer
         * can correlate across services) or mint a new UUID. Echo it back on
         * the response so clients can quote it when reporting an incident.
         * The returned id becomes `req.id` and is auto-included as `reqId`
         * on every log line bound to this request.
         */
        genReqId: (req: IncomingMessage, res: ServerResponse): string => {
            const upstream = req.headers[REQUEST_ID_HEADER];
            const id = typeof upstream === 'string' && upstream.length > 0 ? upstream : randomUUID();
            res.setHeader('X-Request-Id', id);
            return id;
        },
        serializers: {
            req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
            }),
            res: (res) => ({
                statusCode: res.statusCode,
            }),
        },
    },
};
