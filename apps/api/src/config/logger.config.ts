import type { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
    pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
            process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
        redact: ['req.headers.authorization', 'req.headers["x-telegram-init-data"]'],
        serializers: {
            req: (req) => ({
                method: req.method,
                url: req.url,
            }),
            res: (res) => ({
                statusCode: res.statusCode,
            }),
        },
    },
};
