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

        it('should reject JWT_SECRET shorter than 32 characters', () => {
            const shortSecret = { ...validConfig, JWT_SECRET: 'too-short' };

            expect(() => validate(shortSecret)).toThrow('Environment validation failed');
            expect(() => validate(shortSecret)).toThrow('JWT_SECRET');
        });

        it('should accept JWT_SECRET exactly 32 characters', () => {
            const exactly32 = { ...validConfig, JWT_SECRET: 'a'.repeat(32) };

            expect(() => validate(exactly32)).not.toThrow();
        });

        it('should reject placeholder JWT_SECRET in production', () => {
            const placeholderInProd = {
                ...validConfig,
                JWT_SECRET: 'replace-me-with-a-32-char-random-string',
                NODE_ENV: 'production',
            };

            expect(() => validate(placeholderInProd)).toThrow('Environment validation failed');
            expect(() => validate(placeholderInProd)).toThrow('JWT_SECRET');
            expect(() => validate(placeholderInProd)).toThrow('placeholder');
        });

        it('should reject JWT_SECRET containing "changeme" in production', () => {
            const changeme = {
                ...validConfig,
                JWT_SECRET: 'changeme-changeme-changeme-changeme',
                NODE_ENV: 'production',
            };

            expect(() => validate(changeme)).toThrow('Environment validation failed');
            expect(() => validate(changeme)).toThrow('JWT_SECRET');
        });

        it('should accept placeholder JWT_SECRET in development', () => {
            const placeholderInDev = {
                ...validConfig,
                JWT_SECRET: 'replace-me-with-a-32-char-random-string',
                NODE_ENV: 'development',
            };

            expect(() => validate(placeholderInDev)).not.toThrow();
        });

        describe('SWAGGER_ENABLED', () => {
            it('defaults to "true" when the var is absent', () => {
                expect(validate(validConfig).SWAGGER_ENABLED).toBe('true');
            });

            it('accepts "true" and "false"', () => {
                expect(validate({ ...validConfig, SWAGGER_ENABLED: 'true' }).SWAGGER_ENABLED).toBe('true');
                expect(validate({ ...validConfig, SWAGGER_ENABLED: 'false' }).SWAGGER_ENABLED).toBe('false');
            });

            it('rejects anything other than "true"/"false"', () => {
                expect(() => validate({ ...validConfig, SWAGGER_ENABLED: 'yes' })).toThrow('SWAGGER_ENABLED');
                expect(() => validate({ ...validConfig, SWAGGER_ENABLED: '1' })).toThrow('SWAGGER_ENABLED');
            });
        });
    });
});
