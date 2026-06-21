import { MeController } from '../me.controller';

describe('MeController.getMe — subscriber capture', () => {
    it('upserts a mini_app subscriber from the telegram identity', () => {
        const subscribers = { upsert: jest.fn().mockResolvedValue(undefined) };
        const controller = new MeController({} as never, subscribers as never);
        const identity = { id: 42, first_name: 'Лев', username: 'lev' } as never;

        controller.getMe(null, identity);

        expect(subscribers.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 42, source: 'mini_app', firstName: 'Лев', username: 'lev' }),
        );
    });
});
