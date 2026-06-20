import type { BotError, Context } from 'grammy';
import type { Logger } from 'pino';

export function errorMiddleware(logger: Logger): (error: BotError<Context>) => void {
    return (error: BotError<Context>): void => {
        const ctx = error.ctx;
        const err = error.error;

        logger.error(
            {
                updateId: ctx.update.update_id,
                chatId: ctx.chat?.id,
                userId: ctx.from?.id,
                errorName: err instanceof Error ? err.name : 'UnknownError',
                errorMessage: err instanceof Error ? err.message : String(err),
                errorStack: err instanceof Error ? err.stack : undefined,
            },
            'Bot error occurred',
        );

        // Don't rethrow - allow bot to continue processing other updates
    };
}
