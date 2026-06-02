import { MINI_APP_BUTTON_TEXT } from '@fitcalendar/shared';
import type { BotError, Context } from 'grammy';
import { Bot } from 'grammy';
import type { Logger } from 'pino';

import { createBot } from '../bot';
import { registerStartCommand } from '../commands/start.command';
import { errorMiddleware } from '../middleware/error.middleware';

// Mock grammy
jest.mock('grammy', () => ({
    Bot: jest.fn().mockImplementation(() => ({
        command: jest.fn(),
        catch: jest.fn(),
    })),
}));

// Mock pino
jest.mock('pino', () => {
    return jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }));
});

describe('Bot', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createBot', () => {
        it('should create a bot instance with the provided token', () => {
            const config = {
                token: 'test-token-123',
                miniAppUrl: 'https://app.example.com',
            };

            const bot = createBot(config);

            expect(Bot).toHaveBeenCalledWith('test-token-123');
            expect(bot).toBeDefined();
        });

        it('should register error handler', () => {
            const config = {
                token: 'test-token-123',
            };

            const mockBot = new Bot('') as unknown as { catch: jest.Mock };
            (Bot as jest.Mock).mockImplementation(() => mockBot);

            createBot(config);

            expect(mockBot.catch).toHaveBeenCalled();
        });

        it('should register start command', () => {
            const config = {
                token: 'test-token-123',
                miniAppUrl: 'https://app.example.com',
            };

            const mockBot = new Bot('') as unknown as { command: jest.Mock; catch: jest.Mock };
            (Bot as jest.Mock).mockImplementation(() => mockBot);

            createBot(config);

            expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function));
        });
    });
});

describe('registerStartCommand', () => {
    it('should register a start command handler', () => {
        const mockBot = {
            command: jest.fn(),
        } as unknown as Bot<Context>;

        registerStartCommand(mockBot, 'https://app.example.com');

        expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function));
    });

    it('should work without miniAppUrl', () => {
        const mockBot = {
            command: jest.fn(),
        } as unknown as Bot<Context>;

        registerStartCommand(mockBot, undefined);

        expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function));
    });

    it('should send Russian welcome message with Mini App button (P0 - core user journey)', async () => {
        const mockReply = jest.fn().mockResolvedValue(undefined);
        const mockBot = {
            command: jest.fn(),
        } as unknown as Bot<Context>;

        registerStartCommand(mockBot, 'https://app.example.com');

        // Get the registered handler
        const handler = (mockBot.command as jest.Mock).mock.calls[0][1];

        // Create mock context
        const mockCtx = {
            reply: mockReply,
        };

        // Execute handler
        await handler(mockCtx);

        // Verify Russian welcome message (no API_URL in test env → generic club name)
        expect(mockReply).toHaveBeenCalledWith(
            expect.stringContaining('Привет!'),
            expect.objectContaining({
                reply_markup: expect.objectContaining({
                    inline_keyboard: expect.arrayContaining([
                        expect.arrayContaining([
                            expect.objectContaining({
                                text: MINI_APP_BUTTON_TEXT,
                                web_app: { url: 'https://app.example.com' },
                            }),
                        ]),
                    ]),
                }),
            }),
        );
    });

    it('should send welcome message without button when miniAppUrl not provided', async () => {
        const mockReply = jest.fn().mockResolvedValue(undefined);
        const mockBot = {
            command: jest.fn(),
        } as unknown as Bot<Context>;

        registerStartCommand(mockBot, undefined);

        // Get the registered handler
        const handler = (mockBot.command as jest.Mock).mock.calls[0][1];

        // Create mock context
        const mockCtx = {
            reply: mockReply,
        };

        // Execute handler
        await handler(mockCtx);

        // Verify Russian welcome message without an inline keyboard
        expect(mockReply).toHaveBeenCalledWith(
            expect.stringContaining('Привет!'),
            expect.objectContaining({ reply_markup: undefined }),
        );
    });
});

describe('errorMiddleware', () => {
    it('should return a function', () => {
        const mockLogger = {
            error: jest.fn(),
        } as unknown as Logger;

        const middleware = errorMiddleware(mockLogger);

        expect(typeof middleware).toBe('function');
    });

    it('should log error details when called', () => {
        const mockLogger = {
            error: jest.fn(),
        } as unknown as Logger;

        const middleware = errorMiddleware(mockLogger);

        const mockError = {
            ctx: {
                update: { update_id: 123 },
                chat: { id: 456 },
                from: { id: 789 },
            },
            error: new Error('Test error'),
        };

        middleware(mockError as unknown as BotError<Context>);

        expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should not throw or rethrow errors (P0 - reliability)', () => {
        const mockLogger = {
            error: jest.fn(),
        } as unknown as Logger;

        const middleware = errorMiddleware(mockLogger);

        const mockError = {
            ctx: {
                update: { update_id: 123 },
                chat: { id: 456 },
                from: { id: 789 },
            },
            error: new Error('Critical error that should not crash bot'),
        };

        // Should not throw - bot must continue processing
        expect(() => {
            middleware(mockError as unknown as BotError<Context>);
        }).not.toThrow();
    });
});
