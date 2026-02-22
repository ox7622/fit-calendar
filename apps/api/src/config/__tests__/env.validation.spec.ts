import 'reflect-metadata';

import { validate } from '../env.validation';

describe('Environment Validation', () => {
    const validConfig = {
        NX_DB_HOST: 'localhost',
        NX_DB_PORT: '5432',
        NX_DB_NAME: 'fitcalendar',
        NX_DB_USER: 'postgres',
        NX_DB_PASS: 'password',
        NX_BE_API_FITCALENDAR_SERVICE_PORT: '3020',
        NX_BE_API_FITCALENDAR_SERVICE_PREFIX: 'api',
        JWT_SECRET: 'super-secret-key-min-32-characters',
        TELEGRAM_BOT_TOKEN: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        TELEGRAM_WEBHOOK_SECRET: 'webhook-secret-key',
    };

    describe('validate', () => {
        it('should pass validation with valid config', () => {
            const result = validate(validConfig);

            expect(result).toBeDefined();
            expect(result.NX_DB_HOST).toBe('localhost');
            expect(result.NX_DB_PORT).toBe(5432);
            expect(result.NX_DB_NAME).toBe('fitcalendar');
        });

        it('should set default values for optional variables', () => {
            const result = validate(validConfig);

            expect(result.LOG_LEVEL).toBe('info');
            expect(result.NODE_ENV).toBe('development');
        });

        it('should accept optional CORS origins', () => {
            const configWithCors = {
                ...validConfig,
                CORS_ORIGIN_MINI_APP: 'https://app.fitcalendar.ru',
                CORS_ORIGIN_ADMIN: 'https://admin.fitcalendar.ru',
            };

            const result = validate(configWithCors);

            expect(result.CORS_ORIGIN_MINI_APP).toBe('https://app.fitcalendar.ru');
            expect(result.CORS_ORIGIN_ADMIN).toBe('https://admin.fitcalendar.ru');
        });

        it('should throw error when NX_DB_HOST is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { NX_DB_HOST: _host, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('NX_DB_HOST');
        });

        it('should throw error when NX_DB_PORT is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { NX_DB_PORT: _port, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('NX_DB_PORT');
        });

        it('should throw error when NX_DB_NAME is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { NX_DB_NAME: _name, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('NX_DB_NAME');
        });

        it('should throw error when JWT_SECRET is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { JWT_SECRET: _secret, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('JWT_SECRET');
        });

        it('should throw error when NX_BE_API_FITCALENDAR_SERVICE_PORT is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { NX_BE_API_FITCALENDAR_SERVICE_PORT: _servicePort, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('NX_BE_API_FITCALENDAR_SERVICE_PORT');
        });

        it('should throw error when NX_BE_API_FITCALENDAR_SERVICE_PREFIX is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { NX_BE_API_FITCALENDAR_SERVICE_PREFIX: _prefix, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('NX_BE_API_FITCALENDAR_SERVICE_PREFIX');
        });

        it('should convert string port to number', () => {
            const result = validate(validConfig);

            expect(typeof result.NX_DB_PORT).toBe('number');
            expect(typeof result.NX_BE_API_FITCALENDAR_SERVICE_PORT).toBe('number');
        });

        it('should throw error when TELEGRAM_BOT_TOKEN is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { TELEGRAM_BOT_TOKEN: _token, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('TELEGRAM_BOT_TOKEN');
        });

        it('should throw error when TELEGRAM_WEBHOOK_SECRET is missing', () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { TELEGRAM_WEBHOOK_SECRET: _secret, ...invalidConfig } = validConfig;

            expect(() => validate(invalidConfig)).toThrow('Environment validation failed');
            expect(() => validate(invalidConfig)).toThrow('TELEGRAM_WEBHOOK_SECRET');
        });

        it('should accept optional MINI_APP_URL', () => {
            const configWithMiniApp = {
                ...validConfig,
                MINI_APP_URL: 'https://app.fitcalendar.ru',
            };

            const result = validate(configWithMiniApp);

            expect(result.MINI_APP_URL).toBe('https://app.fitcalendar.ru');
        });
    });
});
