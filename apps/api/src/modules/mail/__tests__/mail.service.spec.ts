import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailService } from '../mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
    const sendMail = jest.fn();
    const createTransport = nodemailer.createTransport as jest.Mock;

    const buildConfig = (values: Record<string, string | undefined>): ConfigService =>
        ({ get: (key: string) => values[key], getOrThrow: (key: string) => values[key] } as unknown as ConfigService);

    beforeEach(() => {
        jest.clearAllMocks();
        createTransport.mockReturnValue({ sendMail });
    });

    const fullConfig = {
        SMTP_HOST: 'smtp.yandex.ru',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'noreply@fit-calendar.ru',
        SMTP_PASS: 'pw',
        SMTP_FROM: 'FitCalendar <noreply@fit-calendar.ru>',
    };

    it('isEnabled() is false when SMTP_HOST is missing', () => {
        const service = new MailService(buildConfig({ ...fullConfig, SMTP_HOST: undefined }));
        expect(service.isEnabled()).toBe(false);
    });

    it('isEnabled() is true when all required vars are set', () => {
        const service = new MailService(buildConfig(fullConfig));
        expect(service.isEnabled()).toBe(true);
    });

    it('sends an invite email with the invite subject and recipient', async () => {
        const service = new MailService(buildConfig(fullConfig));
        await service.sendAdminSetPasswordLink({
            to: 'masha@example.com',
            name: 'Мария',
            url: 'https://admin.fit-calendar.ru/set-password?token=abc',
            expiresAt: '2026-06-14T00:00:00.000Z',
            purpose: 'invite',
        });
        expect(sendMail).toHaveBeenCalledTimes(1);
        const arg = sendMail.mock.calls[0][0];
        expect(arg.to).toBe('masha@example.com');
        expect(arg.from).toBe('FitCalendar <noreply@fit-calendar.ru>');
        expect(arg.subject).toContain('Приглашение');
        expect(arg.html).toContain('https://admin.fit-calendar.ru/set-password?token=abc');
        expect(arg.text).toContain('https://admin.fit-calendar.ru/set-password?token=abc');
    });

    it('uses the reset subject for purpose=reset', async () => {
        const service = new MailService(buildConfig(fullConfig));
        await service.sendAdminSetPasswordLink({
            to: 'masha@example.com',
            name: 'Мария',
            url: 'https://admin.fit-calendar.ru/set-password?token=abc',
            expiresAt: '2026-06-14T00:00:00.000Z',
            purpose: 'reset',
        });
        expect(sendMail.mock.calls[0][0].subject).toContain('Сброс пароля');
    });

    it('creates the transport only once across calls', async () => {
        const service = new MailService(buildConfig(fullConfig));
        const params = {
            to: 'm@e.com',
            name: 'M',
            url: 'https://x/set-password?token=1',
            expiresAt: '2026-06-14T00:00:00.000Z',
            purpose: 'invite' as const,
        };
        await service.sendAdminSetPasswordLink(params);
        await service.sendAdminSetPasswordLink(params);
        expect(createTransport).toHaveBeenCalledTimes(1);
    });
});
