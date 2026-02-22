import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { ITelegramUserData } from '../guards/telegram-auth.guard';

/**
 * Parameter decorator to extract Telegram user data from request
 * Must be used with TelegramAuthGuard
 *
 * @example
 * ```typescript
 * @Get('me')
 * @UseGuards(TelegramAuthGuard)
 * getMe(@TelegramUser() user: ITelegramUserData) {
 *   return user;
 * }
 * ```
 */
export const TelegramUser = createParamDecorator(
    (data: keyof ITelegramUserData | undefined, ctx: ExecutionContext): ITelegramUserData | unknown => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const user = request.telegramUser;

        if (!user) {
            return undefined;
        }

        // If a specific property is requested, return just that property
        if (data) {
            return user[data];
        }

        return user;
    },
);
