import type { Customer } from '@fitcalendar/db';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

import type { CustomerService } from '../../../modules/customer/customer.service';
import type { ITelegramUserData } from '../telegram-auth.guard';
import { TelegramAuthGuard } from '../telegram-auth.guard';

describe('TelegramAuthGuard', () => {
    let guard: TelegramAuthGuard;
    let mockConfigService: jest.Mocked<ConfigService>;
    let mockCustomerService: jest.Mocked<Pick<CustomerService, 'findByTelegramId'>>;

    const BOT_TOKEN = 'test_bot_token_1234567890:ABCdefGHIjklMNOpqrsTUVwxyz';

    function generateInitData(user: ITelegramUserData, authDate: number = Math.floor(Date.now() / 1000)): string {
        const params = new URLSearchParams();
        params.set('user', JSON.stringify(user));
        params.set('auth_date', authDate.toString());
        params.set('query_id', 'AAHdF6IQAAAAAN0XohDhrOrc');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

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
        mockCustomerService = {
            findByTelegramId: jest.fn().mockResolvedValue(null),
        };

        guard = new TelegramAuthGuard(mockConfigService, mockCustomerService as unknown as CustomerService);
    });

    function createMockExecutionContext(initData: string | undefined): ExecutionContext {
        const mockRequest: {
            headers: Record<string, string | undefined>;
            telegramIdentity?: ITelegramUserData;
            telegramInitData?: unknown;
            customer?: Customer | null;
        } = {
            headers: { 'x-telegram-init-data': initData },
        };

        return {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
            }),
        } as ExecutionContext;
    }

    describe('canActivate', () => {
        it('attaches the Telegram identity to the request and looks up the customer', async () => {
            const initData = generateInitData(mockUser);
            const context = createMockExecutionContext(initData);

            const result = await guard.canActivate(context);

            expect(result).toBe(true);
            const request = context.switchToHttp().getRequest();
            expect(request.telegramIdentity).toEqual(mockUser);
            expect(mockCustomerService.findByTelegramId).toHaveBeenCalledWith(mockUser.id);
            expect(request.customer).toBeNull();
        });

        it('sets request.customer to the matching record when one exists (linked)', async () => {
            const linkedCustomer = { id: 'cust-1', telegramId: mockUser.id } as Customer;
            mockCustomerService.findByTelegramId.mockResolvedValueOnce(linkedCustomer);

            const initData = generateInitData(mockUser);
            const context = createMockExecutionContext(initData);
            await guard.canActivate(context);

            expect(context.switchToHttp().getRequest().customer).toBe(linkedCustomer);
        });

        it('rejects when initData header is missing', async () => {
            await expect(guard.canActivate(createMockExecutionContext(undefined))).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('rejects on an invalid HMAC hash', async () => {
            const params = new URLSearchParams();
            params.set('user', JSON.stringify(mockUser));
            params.set('auth_date', Math.floor(Date.now() / 1000).toString());
            params.set('hash', 'invalid_hash_value');

            await expect(guard.canActivate(createMockExecutionContext(params.toString()))).rejects.toThrow(
                'Invalid Telegram authentication',
            );
        });

        it('rejects expired initData (auth_date older than 24h)', async () => {
            const expiredDate = Math.floor(Date.now() / 1000) - 172800;
            const initData = generateInitData(mockUser, expiredDate);

            await expect(guard.canActivate(createMockExecutionContext(initData))).rejects.toThrow(
                'Telegram authentication expired',
            );
        });

        it('rejects when initData omits the user field', async () => {
            const params = new URLSearchParams();
            params.set('auth_date', Math.floor(Date.now() / 1000).toString());
            const dataCheckString = [...params.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => `${k}=${v}`)
                .join('\n');
            const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
            const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
            params.set('hash', hash);

            await expect(guard.canActivate(createMockExecutionContext(params.toString()))).rejects.toThrow(
                'No user data in Telegram authentication',
            );
        });

        it('attaches parsed initData (including auth_date) to the request', async () => {
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
        it('throws if TELEGRAM_BOT_TOKEN is missing', () => {
            const emptyConfigService = {
                get: jest.fn().mockReturnValue(undefined),
            } as unknown as jest.Mocked<ConfigService>;

            expect(
                () => new TelegramAuthGuard(emptyConfigService, mockCustomerService as unknown as CustomerService),
            ).toThrow('TELEGRAM_BOT_TOKEN is not configured');
        });
    });
});
