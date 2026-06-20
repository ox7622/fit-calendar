import { Body, Controller, Headers, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';

import type { IWebhookUpdate } from './bot.service';
import { BotService } from './bot.service';

@ApiExcludeController()
@Controller('bot')
export class BotController {
    constructor(private readonly botService: BotService, private readonly configService: ConfigService) {}

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    async webhook(
        @Body() update: IWebhookUpdate,
        @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
    ): Promise<{ ok: boolean }> {
        const expectedSecret = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

        // Validate webhook secret
        if (expectedSecret && secretToken !== expectedSecret) {
            throw new UnauthorizedException('Invalid webhook secret');
        }

        await this.botService.handleUpdate(update);

        return { ok: true };
    }
}
