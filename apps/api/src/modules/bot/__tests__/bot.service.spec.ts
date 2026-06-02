import { GrammyError, InlineKeyboard } from 'grammy';

import { BotNotInitializedError, BotService } from '../bot.service';

/**
 * Most of BotService is initialized inside onModuleInit (which constructs a
 * grammY Bot and wires command handlers). For 5.3 we only need to test the
 * new outbound `sendNotification` method, so we instantiate the class directly
 * and inject a stub bot via the private field. This keeps the test focused
 * and avoids dragging the whole onModuleInit init path into a unit test.
 */
function buildService(stubBot: { api: { sendMessage: jest.Mock } } | null): BotService {
    const service = new BotService(
        { get: () => undefined } as unknown as ConstructorParameters<typeof BotService>[0],
        {} as unknown as ConstructorParameters<typeof BotService>[1],
        {} as unknown as ConstructorParameters<typeof BotService>[2],
    );
    Object.assign(service, { bot: stubBot });
    return service;
}

describe('BotService.sendNotification', () => {
    it('calls bot.api.sendMessage with HTML parse_mode and the reply markup', async () => {
        const sendMessage = jest.fn().mockResolvedValue(undefined);
        const service = buildService({ api: { sendMessage } });
        const keyboard = new InlineKeyboard().webApp('Open', 'https://example.com');

        await service.sendNotification(123, '<b>Hello</b>', { replyMarkup: keyboard });

        expect(sendMessage).toHaveBeenCalledWith(123, '<b>Hello</b>', {
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    });

    it('accepts a missing replyMarkup (plain-text fallback)', async () => {
        const sendMessage = jest.fn().mockResolvedValue(undefined);
        const service = buildService({ api: { sendMessage } });

        await service.sendNotification(123, 'Hi');

        expect(sendMessage).toHaveBeenCalledWith(123, 'Hi', {
            parse_mode: 'HTML',
            reply_markup: undefined,
        });
    });

    it('throws BotNotInitializedError when the bot is not configured', async () => {
        const service = buildService(null);

        await expect(service.sendNotification(123, 'Hi')).rejects.toThrow(BotNotInitializedError);
    });
});

describe('BotService.buildWebhookUrl', () => {
    it('includes the global API prefix so Telegram hits the real controller route', () => {
        expect(BotService.buildWebhookUrl('https://api.fitcalendar.ru', 'api')).toBe(
            'https://api.fitcalendar.ru/api/bot/webhook',
        );
    });

    it('tolerates a trailing slash on the origin and stray slashes on the prefix', () => {
        expect(BotService.buildWebhookUrl('https://api.fitcalendar.ru/', '/api/')).toBe(
            'https://api.fitcalendar.ru/api/bot/webhook',
        );
    });

    it('omits the prefix segment when the prefix is empty', () => {
        expect(BotService.buildWebhookUrl('https://api.fitcalendar.ru', '')).toBe(
            'https://api.fitcalendar.ru/bot/webhook',
        );
    });
});

describe('BotService.isPermanentSendError', () => {
    function makeGrammyError(errorCode: number): GrammyError {
        const err = Object.create(GrammyError.prototype) as GrammyError;
        Object.assign(err, { message: 'mock', error_code: errorCode });
        return err;
    }

    it('returns true for 403 Forbidden (user blocked the bot)', () => {
        expect(BotService.isPermanentSendError(makeGrammyError(403))).toBe(true);
    });

    it('returns true for 400 Bad Request (chat not found)', () => {
        expect(BotService.isPermanentSendError(makeGrammyError(400))).toBe(true);
    });

    it('returns false for 5xx (transient — retry path)', () => {
        expect(BotService.isPermanentSendError(makeGrammyError(500))).toBe(false);
    });

    it('returns false for non-Grammy errors (network errors etc.)', () => {
        expect(BotService.isPermanentSendError(new Error('network'))).toBe(false);
    });
});
