import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { ITelegramUserData } from '../guards/telegram-auth.guard';

/**
 * Returns the parsed Telegram identity (from initData). Always present when
 * the route is protected by `TelegramAuthGuard` — the guard rejects with 401
 * if initData is missing/invalid.
 */
export const TelegramIdentity = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): ITelegramUserData | undefined => {
        const request = ctx.switchToHttp().getRequest<Request>();
        return request.telegramIdentity;
    },
);
