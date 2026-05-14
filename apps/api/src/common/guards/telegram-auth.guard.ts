import type { Customer as CustomerEntity } from '@fitcalendar/db';
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Request } from 'express';

import { CustomerService } from '../../modules/customer/customer.service';

export interface ITelegramUserData {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    allows_write_to_pm?: boolean;
    photo_url?: string;
}

export interface ITelegramInitData {
    user: ITelegramUserData;
    auth_date: number;
    hash: string;
    query_id?: string;
    chat_type?: string;
    chat_instance?: string;
    start_param?: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Request {
            /**
             * Always populated by `TelegramAuthGuard` (the guard 401s if initData
             * is missing or invalid, so handler code can rely on it being set).
             */
            telegramIdentity?: ITelegramUserData;
            telegramInitData?: ITelegramInitData;
            /**
             * `null` when the Telegram identity has not yet been linked to a customer
             * record. Routes that require a linked customer should additionally apply
             * `RequiresLinkedCustomer`, which 403s with code `CUSTOMER_NOT_LINKED`.
             */
            customer?: CustomerEntity | null;
        }
    }
}

/**
 * Story 7.2 — validates initData and looks up the matching customer (if any).
 * Does NOT auto-create customer records (the old User upsert path is gone);
 * customers are managed by the admin panel and linked to a Telegram identity
 * via the phone-match flow on POST /me/link-phone.
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
    private readonly logger = new Logger(TelegramAuthGuard.name);
    private readonly botToken: string;
    private readonly authDataMaxAge: number = 86400; // 24 hours in seconds

    constructor(
        private readonly configService: ConfigService,
        // forwardRef breaks the import cycle: CustomerModule re-exports the guard,
        // and CustomerService is registered inside the same module.
        @Inject(forwardRef(() => CustomerService))
        private readonly customerService: CustomerService,
    ) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
            throw new Error('TELEGRAM_BOT_TOKEN is not configured');
        }
        this.botToken = token;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const initData = request.headers['x-telegram-init-data'] as string;

        if (!initData) {
            this.logger.warn('Missing X-Telegram-Init-Data header');
            throw new UnauthorizedException('Missing Telegram authentication data');
        }

        let parsedData: ITelegramInitData;
        try {
            parsedData = this.parseInitData(initData);
        } catch (error) {
            this.logger.warn('Failed to parse initData', error);
            throw new UnauthorizedException('Invalid Telegram authentication');
        }

        if (!this.validateInitData(initData)) {
            this.logger.warn('Invalid initData hash');
            throw new UnauthorizedException('Invalid Telegram authentication');
        }

        const authDate = parsedData.auth_date;
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime - authDate > this.authDataMaxAge) {
            this.logger.warn('Auth data expired');
            throw new UnauthorizedException('Telegram authentication expired');
        }

        if (!parsedData.user) {
            throw new UnauthorizedException('No user data in Telegram authentication');
        }

        request.telegramIdentity = parsedData.user;
        request.telegramInitData = parsedData;
        // Customer lookup — may be null for unlinked users. Customer-required
        // routes layer on RequiresLinkedCustomer to convert null → 403.
        request.customer = await this.customerService.findByTelegramId(parsedData.user.id);

        return true;
    }

    private parseInitData(initData: string): ITelegramInitData {
        const params = new URLSearchParams(initData);
        const result: Record<string, unknown> = {};

        for (const [key, value] of params.entries()) {
            if (key === 'user') {
                result[key] = JSON.parse(value);
            } else if (key === 'auth_date') {
                result[key] = parseInt(value, 10);
            } else {
                result[key] = value;
            }
        }

        return result as unknown as ITelegramInitData;
    }

    /**
     * Validate initData using HMAC-SHA256 per Telegram documentation.
     * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     */
    private validateInitData(initData: string): boolean {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');

        if (!hash) {
            return false;
        }

        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = createHmac('sha256', 'WebAppData').update(this.botToken).digest();
        const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return hash === calculatedHash;
    }
}
