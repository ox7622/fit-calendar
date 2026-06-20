import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { BotController } from '../bot.controller';
import type { IWebhookUpdate } from '../bot.service';
import { BotService } from '../bot.service';

describe('BotController', () => {
    let controller: BotController;
    let botService: jest.Mocked<BotService>;
    let configService: jest.Mocked<ConfigService>;

    const mockUpdate: IWebhookUpdate = {
        update_id: 123456789,
        message: {
            message_id: 1,
            from: {
                id: 12345,
                first_name: 'Test',
                username: 'testuser',
            },
            chat: {
                id: 12345,
                type: 'private',
            },
            text: '/start',
            date: 1234567890,
        },
    };

    beforeEach(async () => {
        const mockBotService = {
            handleUpdate: jest.fn().mockResolvedValue(undefined),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BotController],
            providers: [
                { provide: BotService, useValue: mockBotService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        controller = module.get<BotController>(BotController);
        botService = module.get(BotService);
        configService = module.get(ConfigService);
    });

    describe('webhook', () => {
        it('should process valid update with correct secret', async () => {
            configService.get.mockReturnValue('valid-secret');

            const result = await controller.webhook(mockUpdate, 'valid-secret');

            expect(result).toEqual({ ok: true });
            expect(botService.handleUpdate).toHaveBeenCalledWith(mockUpdate);
        });

        it('should reject invalid secret', async () => {
            configService.get.mockReturnValue('valid-secret');

            await expect(controller.webhook(mockUpdate, 'invalid-secret')).rejects.toThrow(UnauthorizedException);
            expect(botService.handleUpdate).not.toHaveBeenCalled();
        });

        it('should reject missing secret when configured', async () => {
            configService.get.mockReturnValue('valid-secret');

            await expect(controller.webhook(mockUpdate, undefined)).rejects.toThrow(UnauthorizedException);
            expect(botService.handleUpdate).not.toHaveBeenCalled();
        });

        it('should allow update when no secret is configured', async () => {
            configService.get.mockReturnValue(undefined);

            const result = await controller.webhook(mockUpdate, undefined);

            expect(result).toEqual({ ok: true });
            expect(botService.handleUpdate).toHaveBeenCalledWith(mockUpdate);
        });

        it('should handle callback query updates', async () => {
            configService.get.mockReturnValue('valid-secret');

            const callbackUpdate: IWebhookUpdate = {
                update_id: 123456790,
                callback_query: {
                    id: 'callback-123',
                    from: {
                        id: 12345,
                        first_name: 'Test',
                    },
                    data: 'some_action',
                },
            };

            const result = await controller.webhook(callbackUpdate, 'valid-secret');

            expect(result).toEqual({ ok: true });
            expect(botService.handleUpdate).toHaveBeenCalledWith(callbackUpdate);
        });

        it('should propagate errors from bot service', async () => {
            configService.get.mockReturnValue('valid-secret');
            botService.handleUpdate.mockRejectedValue(new Error('Bot processing error'));

            await expect(controller.webhook(mockUpdate, 'valid-secret')).rejects.toThrow('Bot processing error');
        });
    });
});
