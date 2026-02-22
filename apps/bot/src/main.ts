import { createBot, logger } from './bot';

async function bootstrap(): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        logger.error('TELEGRAM_BOT_TOKEN environment variable is required');
        process.exit(1);
    }

    const bot = createBot({
        token,
        miniAppUrl: process.env.MINI_APP_URL,
    });

    // In development, can use polling mode
    // In production, webhooks are set up via API
    if (process.env.BOT_MODE === 'polling') {
        logger.info('Starting bot in polling mode...');
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
