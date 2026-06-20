import type { ConfigService } from '@nestjs/config';

import { MailService } from '../mail.service';

describe('MailService', () => {
    const fetchMock = jest.fn();

    const buildConfig = (values: Record<string, string | undefined>): ConfigService =>
        ({ get: (key: string) => values[key], getOrThrow: (key: string) => values[key] } as unknown as ConfigService);

    const fullConfig = {
        UNISENDER_API_KEY: 'key-123',
        MAIL_FROM_EMAIL: 'noreply@fit-calendar.ru',
        MAIL_FROM_NAME: 'FitCalendar',
    };

    const okResponse = (body: unknown): Response =>
        ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as Response);

    const baseParams = {
        to: 'masha@example.com',
        name: 'Мария',
        url: 'https://admin.fit-calendar.ru/set-password?token=abc',
        expiresAt: '2026-06-14T00:00:00.000Z',
        purpose: 'invite' as const,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    it('isEnabled() is false when the API key is missing', () => {
        const service = new MailService(buildConfig({ ...fullConfig, UNISENDER_API_KEY: undefined }));
        expect(service.isEnabled()).toBe(false);
    });

    it('isEnabled() is true when API key and sender are set', () => {
        expect(new MailService(buildConfig(fullConfig)).isEnabled()).toBe(true);
    });

    it('POSTs the invite email to Unisender with the API key, sender and invite subject', async () => {
        fetchMock.mockResolvedValue(okResponse({ status: 'success', emails: ['masha@example.com'] }));

        await new MailService(buildConfig(fullConfig)).sendAdminSetPasswordLink(baseParams);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain('/email/send.json');
        expect((init.headers as Record<string, string>)['X-API-KEY']).toBe('key-123');
        const body = JSON.parse(init.body as string);
        expect(body.message.recipients[0].email).toBe('masha@example.com');
        expect(body.message.from_email).toBe('noreply@fit-calendar.ru');
        expect(body.message.from_name).toBe('FitCalendar');
        expect(body.message.subject).toContain('Приглашение');
        expect(body.message.body.html).toContain(baseParams.url);
        expect(body.message.body.plaintext).toContain(baseParams.url);
    });

    it('uses the reset subject for purpose=reset', async () => {
        fetchMock.mockResolvedValue(okResponse({ status: 'success' }));

        await new MailService(buildConfig(fullConfig)).sendAdminSetPasswordLink({ ...baseParams, purpose: 'reset' });

        const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
        expect(body.message.subject).toContain('Сброс пароля');
    });

    it('throws on a non-2xx response', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 401,
            text: async () => '{"status":"error","message":"bad key"}',
            json: async () => ({}),
        } as Response);

        await expect(new MailService(buildConfig(fullConfig)).sendAdminSetPasswordLink(baseParams)).rejects.toThrow();
    });

    it('throws when the recipient is listed in failed_emails', async () => {
        fetchMock.mockResolvedValue(
            okResponse({ status: 'success', failed_emails: { 'masha@example.com': 'invalid' } }),
        );

        await expect(new MailService(buildConfig(fullConfig)).sendAdminSetPasswordLink(baseParams)).rejects.toThrow();
    });
});
