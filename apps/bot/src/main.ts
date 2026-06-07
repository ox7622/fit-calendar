import { createBot, logger } from './bot';
import { BOT_COMMANDS } from './commands/schedule.command';

async function bootstrap(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        logger.error('TELEGRAM_BOT_TOKEN environment variable is required');
        process.exit(1);
    }

    const miniAppUrl = process.env.MINI_APP_URL;
    const bot = createBot({
        token,
        miniAppUrl,
    });

    // In development, can use polling mode
    // In production, webhooks are set up via API
    if (process.env.BOT_MODE === 'polling') {
        logger.info('Starting bot in polling mode...');
        // Populate the "/" command menu so users pick commands instead of typing.
        try {
            await bot.api.setMyCommands(BOT_COMMANDS);
        } catch (error) {
            logger.warn({ error }, 'Failed to set bot command menu');
        }
        // The menu button (left of the input) expands the slash-command list
        // populated above, so users can pick /today, /tomorrow, /week, etc.
        try {
            await bot.api.setChatMenuButton({ menu_button: { type: 'commands' } });
        } catch (error) {
            logger.warn({ error }, 'Failed to set chat menu button');
        }
        await bot.start({
            onStart: (botInfo) => {
                logger.info(`Bot @${botInfo.username} started in polling mode`);
            },
        });
    } else {
        logger.info('Bot configured for webhook mode. Webhooks are handled by API service.');
        logger.info('Set BOT_MODE=polling to run in standalone polling mode for development.');
    }
}

bootstrap().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
});
