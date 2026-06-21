import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';

/** Lets a user opt out of broadcasts. /start re-subscribes via the capture middleware. */
export function registerStopCommand(bot: Bot<Context>, subscribers: BotSubscriberService): void {
    bot.command('stop', async (ctx) => {
        if (!ctx.from) return;
        await subscribers.deactivate(ctx.from.id);
        await ctx.reply('Вы отписались от уведомлений. Отправьте /start, чтобы снова их включить.');
    });
}
