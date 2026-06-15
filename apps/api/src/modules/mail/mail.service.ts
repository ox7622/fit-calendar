import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TAdminLinkPurpose = 'invite' | 'reset';

export interface ISendAdminSetPasswordLinkParams {
    to: string;
    name: string;
    url: string;
    /** ISO timestamp at which the link expires. */
    expiresAt: string;
    purpose: TAdminLinkPurpose;
}

// Unisender Go transactional email API. Sent over HTTPS (443) because the prod
// VPS blocks outbound SMTP ports (25/465/587) — raw SMTP can't be used there.
const UNISENDER_ENDPOINT = 'https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json';
// Bounded so a slow/unreachable provider can never hang the HTTP request that
// awaits the send (the caller wants emailSent synchronously); on timeout we abort
// and the caller degrades to emailSent=false + copy-link fallback.
const SEND_TIMEOUT_MS = 10_000;

interface IUnisenderSendResponse {
    status?: string;
    failed_emails?: Record<string, string>;
    message?: string;
    code?: number;
}

@Injectable()
export class MailService {
    constructor(private readonly config: ConfigService) {}

    /**
     * Mirrors the Cloudinary "optional in dev" pattern: the feature is inert
     * unless the API key and sender are configured. Callers gate on this before
     * attempting a send so a missing config never surfaces as an error.
     */
    isEnabled(): boolean {
        return Boolean(this.config.get<string>('UNISENDER_API_KEY') && this.config.get<string>('MAIL_FROM_EMAIL'));
    }

    async sendAdminSetPasswordLink(params: ISendAdminSetPasswordLinkParams): Promise<void> {
        const apiKey = this.config.getOrThrow<string>('UNISENDER_API_KEY');
        const fromEmail = this.config.getOrThrow<string>('MAIL_FROM_EMAIL');
        const fromName = this.config.get<string>('MAIL_FROM_NAME') ?? 'FitCalendar';
        const { subject, html, text } = this.buildEmail(params);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

        let response: Response;
        try {
            response = await fetch(UNISENDER_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
                body: JSON.stringify({
                    message: {
                        recipients: [{ email: params.to }],
                        body: { html, plaintext: text },
                        subject,
                        from_email: fromEmail,
                        from_name: fromName,
                    },
                }),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Unisender send failed: HTTP ${response.status} ${body.slice(0, 300)}`);
        }

        const data = (await response.json()) as IUnisenderSendResponse;
        if (data.status !== 'success') {
            throw new Error(`Unisender send not successful: ${data.message ?? JSON.stringify(data).slice(0, 300)}`);
        }
        // HTTP 200 + status=success still reports per-address rejections here.
        const rejection = data.failed_emails?.[params.to];
        if (rejection) {
            throw new Error(`Unisender rejected ${params.to}: ${rejection}`);
        }
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
                    <a href="${url}" style="display:inline-block;padding:10px 18px;background:#229b8b;color:#fff;border-radius:6px;text-decoration:none;">
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
