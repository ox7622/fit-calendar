import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { Request } from 'express';

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
            telegramUser?: ITelegramUserData;
            telegramInitData?: ITelegramInitData;
        }
    }
}

@Injectable()
export class TelegramAuthGuard implements CanActivate {
    private readonly logger = new Logger(TelegramAuthGuard.name);
    private readonly botToken: string;
    private readonly authDataMaxAge: number = 86400; // 24 hours in seconds

    constructor(private readonly configService: ConfigService) {
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

        try {
            const parsedData = this.parseInitData(initData);

            // Validate the hash
            if (!this.validateInitData(initData)) {
                this.logger.warn('Invalid initData hash');
                throw new UnauthorizedException('Invalid Telegram authentication');
            }

            // Check auth_date is not too old
            const authDate = parsedData.auth_date;
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime - authDate > this.authDataMaxAge) {
                this.logger.warn('Auth data expired');
                throw new UnauthorizedException('Telegram authentication expired');
            }

            // Attach user data to request
            if (!parsedData.user) {
                throw new UnauthorizedException('No user data in Telegram authentication');
            }

            request.telegramUser = parsedData.user;
            request.telegramInitData = parsedData;

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            this.logger.error('Error validating Telegram auth:', error);
            throw new UnauthorizedException('Invalid Telegram authentication');
        }
    }

    /**
     * Parse initData string into structured object
     */
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
     * Validate initData using HMAC-SHA256 per Telegram documentation
     * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
     */
    private validateInitData(initData: string): boolean {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');

        if (!hash) {
            return false;
        }

        // Remove hash from params
        params.delete('hash');

        // Sort parameters alphabetically and create data-check-string
        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        // Create secret key using HMAC-SHA256 with "WebAppData" as key
        const secretKey = createHmac('sha256', 'WebAppData').update(this.botToken).digest();

        // Calculate hash using the secret key
        const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return hash === calculatedHash;
    }
}
