import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

import type { ITelegramUserData } from '../telegram-auth.guard';
import { TelegramAuthGuard } from '../telegram-auth.guard';

describe('TelegramAuthGuard', () => {
    let guard: TelegramAuthGuard;
    let mockConfigService: jest.Mocked<ConfigService>;

    const BOT_TOKEN = 'test_bot_token_1234567890:ABCdefGHIjklMNOpqrsTUVwxyz';

    /**
     * Helper to generate valid initData with HMAC signature
     */
    function generateInitData(user: ITelegramUserData, authDate: number = Math.floor(Date.now() / 1000)): string {
        const params = new URLSearchParams();
        params.set('user', JSON.stringify(user));
        params.set('auth_date', authDate.toString());
        params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');

        // Sort parameters and create data-check-string
        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        // Generate hash
        const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        params.set('hash', hash);
        return params.toString();
    }

    const mockUser: ITelegramUserData = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        language_code: 'en',
    };

    beforeEach(() => {
        mockConfigService = {
            get: jest.fn().mockReturnValue(BOT_TOKEN),
        } as unknown as jest.Mocked<ConfigService>;

        guard = new TelegramAuthGuard(mockConfigService);
    });

    function createMockExecutionContext(initData: string | undefined): ExecutionContext {
        const mockRequest = {
            headers: {
                'x-telegram-init-data': initData,
            },
            telegramUser: undefined as ITelegramUserData | undefined,
            telegramInitData: undefined,
        };

        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
        } as ExecutionContext;
    }

    describe('canActivate', () => {
        it('should pass validation with valid initData', async () => {
            const initData = generateInitData(mockUser);
            const context = createMockExecutionContext(initData);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            const request = context.switchToHttp().getRequest();
            expect(request.telegramUser).toEqual(mockUser);
        });

        it('should reject with missing initData header', async () => {
            const context = createMockExecutionContext(undefined);

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Missing Telegram authentication data');
        });

        it('should reject with invalid hash', async () => {
            const params = new URLSearchParams();
            params.set('user', JSON.stringify(mockUser));
            params.set('auth_date', Math.floor(Date.now() / 1000).toString());
            params.set('hash', 'invalid_hash_value');
            const initData = params.toString();

            const context = createMockExecutionContext(initData);

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Invalid Telegram authentication');
        });

        it('should reject with expired auth_date', async () => {
            // Auth date from 2 days ago
            const expiredDate = Math.floor(Date.now() / 1000) - 172800;
            const initData = generateInitData(mockUser, expiredDate);
            const context = createMockExecutionContext(initData);

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('Telegram authentication expired');
        });

        it('should reject with missing user data', async () => {
            const params = new URLSearchParams();
            params.set('auth_date', Math.floor(Date.now() / 1000).toString());

            // Generate valid hash without user
            const dataCheckString = [...params.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}=${v}`)
                .join('\n');

            const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
            const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
            params.set('hash', hash);

            const context = createMockExecutionContext(params.toString());

            await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
            await expect(guard.canActivate(context)).rejects.toThrow('No user data in Telegram authentication');
        });

        it('should attach parsed initData to request', async () => {
            const initData = generateInitData(mockUser);
            const context = createMockExecutionContext(initData);

            await guard.canActivate(context);

            const request = context.switchToHttp().getRequest();
            expect(request.telegramInitData).toBeDefined();
            expect(request.telegramInitData.user).toEqual(mockUser);
            expect(request.telegramInitData.auth_date).toBeDefined();
        });
    });

    describe('constructor', () => {
        it('should throw if TELEGRAM_BOT_TOKEN is not configured', () => {
            const emptyConfigService = {
                get: jest.fn().mockReturnValue(undefined),
            } as unknown as jest.Mocked<ConfigService>;

            expect(() => new TelegramAuthGuard(emptyConfigService)).toThrow('TELEGRAM_BOT_TOKEN is not configured');
        });
    });
});
