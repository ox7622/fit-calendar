import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type TAdminLinkPurpose = 'invite' | 'reset';

export interface ISendAdminSetPasswordLinkParams {
    to: string;
    name: string;
    url: string;
    /** ISO timestamp at which the link expires. */
    expiresAt: string;
    purpose: TAdminLinkPurpose;
}

@Injectable()
export class MailService {
    private transporter: Transporter | null = null;

    constructor(private readonly config: ConfigService) {}

    /**
     * Mirrors the Cloudinary "optional in dev" pattern: the feature is inert
     * unless all required SMTP vars are present. Callers gate on this before
     * attempting a send so a missing config never surfaces as an error.
     */
    isEnabled(): boolean {
        return Boolean(
            this.config.get<string>('SMTP_HOST') &&
                this.config.get<string>('SMTP_USER') &&
                this.config.get<string>('SMTP_PASS') &&
                this.config.get<string>('SMTP_FROM'),
        );
    }

    async sendAdminSetPasswordLink(params: ISendAdminSetPasswordLinkParams): Promise<void> {
        const transporter = this.getTransporter();
        const { subject, html, text } = this.buildEmail(params);
        await transporter.sendMail({
            from: this.config.getOrThrow<string>('SMTP_FROM'),
            to: params.to,
            subject,
            html,
            text,
        });
    }

    private getTransporter(): Transporter {
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: this.config.getOrThrow<string>('SMTP_HOST'),
                port: Number(this.config.get<string>('SMTP_PORT') ?? '465'),
                secure: (this.config.get<string>('SMTP_SECURE') ?? 'true') === 'true',
                auth: {
                    user: this.config.getOrThrow<string>('SMTP_USER'),
                    pass: this.config.getOrThrow<string>('SMTP_PASS'),
                },
            });
        }
        return this.transporter;
    }

    private buildEmail({ name, url, expiresAt, purpose }: ISendAdminSetPasswordLinkParams): {
        subject: string;
        html: string;
        text: string;
    } {
        const isInvite = purpose === 'invite';
        const subject = isInvite ? 'Приглашение в админку FitCalendar' : 'Сброс пароля — админка FitCalendar';
        const lede = isInvite
            ? 'Вас пригласили администратором в FitCalendar.'
            : 'Запрошен сброс пароля для вашего аккаунта администратора FitCalendar.';
        const expiresHuman = new Date(expiresAt).toLocaleString('ru-RU');

        const text = [
            `Здравствуйте, ${name}!`,
            '',
            lede,
            'Перейдите по ссылке, чтобы задать пароль:',
            url,
            '',
            `Ссылка одноразовая и действует до ${expiresHuman}.`,
            'Если вы не ожидали это письмо — просто проигнорируйте его.',
        ].join('\n');

        const html = `
            <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px;">
                <p>Здравствуйте, ${name}!</p>
                <p>${lede}</p>
                <p>
                    <a href="${url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;">
                        Задать пароль
                    </a>
                </p>
                <p style="color:#666;font-size:13px;">Если кнопка не работает, скопируйте ссылку:<br>${url}</p>
                <p style="color:#666;font-size:13px;">Ссылка одноразовая и действует до ${expiresHuman}.</p>
                <p style="color:#999;font-size:12px;">Если вы не ожидали это письмо — просто проигнорируйте его.</p>
            </div>
        `.trim();

        return { subject, html, text };
    }
}
