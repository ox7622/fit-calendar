import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';

/**
 * Records every human who contacts the bot (any update with a `from`) as a
 * subscriber. Best-effort: capture failure never blocks update handling.
 * MUST be registered BEFORE command handlers so `/start` re-activates first.
 */
export function registerContactCapture(bot: Bot<Context>, subscribers: BotSubscriberService): void {
    bot.use(async (ctx, next) => {
        const from = ctx.from;
        if (from && !from.is_bot) {
            await subscribers
                .upsert({
                    telegramId: from.id,
                    firstName: from.first_name ?? null,
                    username: from.username ?? null,
                    source: 'bot',
                })
                .catch(() => undefined);
        }
        await next();
    });
}
