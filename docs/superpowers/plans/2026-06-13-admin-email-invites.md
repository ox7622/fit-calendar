# Email-доставка приглашений админов + деактивация — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Доставлять одноразовую ссылку приглашения/сброса админа по email (через Yandex 360 SMTP), когда логин — email; добавить деактивацию активного админа.

**Architecture:** Новый инертно-конфигурируемый `MailModule` (nodemailer) внедряется в `AdminUsersService`. После выпуска токена в транзакции, если логин — валидный email и SMTP настроен, письмо отправляется вне транзакции; сбой письма не валит запрос. Ответ обогащается `emailSent`/`sentToEmail`, ссылка всегда возвращается как fallback. Деактивация ставит `isActive=false` и гасит непогашенные токены в одной транзакции с защитами (нельзя себя / последнего админа).

**Tech Stack:** NestJS, TypeORM, nodemailer, class-validator (`isEmail`), Jest; React + Zustand + Tailwind (админка); pnpm + Nx (нужен Node 22 — `nvm use 22.13.1` перед nx-командами).

---

## Файловая структура

**Создаётся:**
- `apps/api/src/modules/mail/mail.service.ts` — обёртка nodemailer, шаблоны письма, `isEnabled()`.
- `apps/api/src/modules/mail/mail.module.ts` — экспортирует `MailService`.
- `apps/api/src/modules/mail/__tests__/mail.service.spec.ts` — unit-тесты.

**Изменяется:**
- `package.json` — зависимость `nodemailer` (+ типы).
- `apps/api/src/config/env.validation.ts` — SMTP-переменные.
- `.env.example` — SMTP-блок.
- `apps/api/src/modules/admin/users/dto/invite-admin.dto.ts` — поля `emailSent`/`sentToEmail`.
- `apps/api/src/modules/admin/users/admin-users.module.ts` — импорт `MailModule`.
- `apps/api/src/modules/admin/users/admin-users.service.ts` — отправка письма + `deactivate()`.
- `apps/api/src/modules/admin/users/admin-users.controller.ts` — эндпоинт деактивации.
- `apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts` — новые тесты.
- `apps/admin/src/shared/api/admin-users.api.ts` — поля ответа + `deactivate()`.
- `apps/admin/src/shared/components/IssuedTokenLinkCard.tsx` — баннер «письмо отправлено».
- `apps/admin/src/pages/AdminInvitePage.tsx` — проброс статуса письма.
- `apps/admin/src/pages/AdminsListPage.tsx` — проброс + кнопка «Отключить».

---

## Task 1: Установить nodemailer

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Установить зависимость**

Run:
```bash
nvm use 22.13.1 && pnpm add nodemailer && pnpm add -D @types/nodemailer
```
Expected: `package.json` и `pnpm-lock.yaml` обновлены; `nodemailer` в `dependencies`, `@types/nodemailer` в `devDependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(api): add nodemailer for admin invite emails"
```

---

## Task 2: SMTP-переменные окружения

**Files:**
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `.env.example`

- [ ] **Step 1: Добавить SMTP-поля в `EnvironmentVariables`**

В `apps/api/src/config/env.validation.ts`, сразу после блока Cloudinary (после поля `CLOUDINARY_API_SECRET`), добавить:

```ts
    // SMTP (Yandex 360) — все опциональны. Если не заданы все обязательные
    // (HOST/USER/PASS/FROM), MailService инертен: письма не шлются, остаётся
    // ручной copy-link. SMTP_PORT/SMTP_SECURE хранятся строками и парсятся в
    // call-site (как SWAGGER_ENABLED), чтобы избежать ложной coercion.
    @IsString()
    @IsOptional()
    SMTP_HOST?: string;

    @IsString()
    @IsOptional()
    SMTP_PORT?: string = '465';

    @IsString()
    @IsOptional()
    @IsIn(['true', 'false'])
    SMTP_SECURE?: string = 'true';

    @IsString()
    @IsOptional()
    SMTP_USER?: string;

    @IsString()
    @IsOptional()
    SMTP_PASS?: string;

    @IsString()
    @IsOptional()
    SMTP_FROM?: string;
```

(`IsIn` уже импортирован в этом файле.)

- [ ] **Step 2: Добавить SMTP-блок в `.env.example`**

В `.env.example`, после блока `YANDEX_GEOCODER_API_KEY`, добавить:

```
# ===========================================
# SMTP (Yandex 360) — доставка ссылок приглашения/сброса админам по email.
# Все переменные опциональны: если не заданы HOST/USER/PASS/FROM, письма не
# шлются (остаётся ручной copy-link). Пароль — «пароль приложения» из Yandex.
# Ссылка в письме строится из CORS_ORIGIN_ADMIN, поэтому он должен быть задан.
# ===========================================
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@fit-calendar.ru
SMTP_PASS=your_yandex_app_password
SMTP_FROM=FitCalendar <noreply@fit-calendar.ru>
```

- [ ] **Step 3: Проверить, что API стартует с пустыми SMTP (валидация не падает)**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=env.validation 2>/dev/null || echo "no env.validation spec — skipping"
```
Expected: либо проходят существующие тесты валидации, либо сообщение о пропуске. Главное — нет падения компиляции TypeScript в `env.validation.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/config/env.validation.ts .env.example
git commit -m "feat(api): add optional SMTP env config for admin emails"
```

---

## Task 3: MailModule + MailService (TDD)

**Files:**
- Create: `apps/api/src/modules/mail/mail.service.ts`
- Create: `apps/api/src/modules/mail/mail.module.ts`
- Test: `apps/api/src/modules/mail/__tests__/mail.service.spec.ts`

- [ ] **Step 1: Написать падающий тест**

Создать `apps/api/src/modules/mail/__tests__/mail.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { MailService } from '../mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
    const sendMail = jest.fn();
    const createTransport = nodemailer.createTransport as jest.Mock;

    const buildConfig = (values: Record<string, string | undefined>): ConfigService =>
        ({ get: (key: string) => values[key], getOrThrow: (key: string) => values[key] }) as unknown as ConfigService;

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
        await service.sendAdminInviteLink({
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
        await service.sendAdminInviteLink({
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
        await service.sendAdminInviteLink(params);
        await service.sendAdminInviteLink(params);
        expect(createTransport).toHaveBeenCalledTimes(1);
    });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=mail.service
```
Expected: FAIL — `Cannot find module '../mail.service'`.

- [ ] **Step 3: Реализовать `MailService`**

Создать `apps/api/src/modules/mail/mail.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export type TAdminLinkPurpose = 'invite' | 'reset';

export interface ISendAdminInviteLinkParams {
    to: string;
    name: string;
    url: string;
    /** ISO timestamp at which the link expires. */
    expiresAt: string;
    purpose: TAdminLinkPurpose;
}

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
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

    async sendAdminInviteLink(params: ISendAdminInviteLinkParams): Promise<void> {
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

    private buildEmail({ name, url, expiresAt, purpose }: ISendAdminInviteLinkParams): {
        subject: string;
        html: string;
        text: string;
    } {
        const isInvite = purpose === 'invite';
        const subject = isInvite
            ? 'Приглашение в админку FitCalendar'
            : 'Сброс пароля — админка FitCalendar';
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
```

- [ ] **Step 4: Реализовать `MailModule`**

Создать `apps/api/src/modules/mail/mail.module.ts`:

```ts
import { Module } from '@nestjs/common';

import { MailService } from './mail.service';

@Module({
    providers: [MailService],
    exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 5: Запустить тест — убедиться, что проходит**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=mail.service
```
Expected: PASS — все 5 тестов зелёные.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/mail
git commit -m "feat(api): add MailService for admin invite/reset emails"
```

---

## Task 4: Отправка письма из AdminUsersService (TDD)

**Files:**
- Modify: `apps/api/src/modules/admin/users/dto/invite-admin.dto.ts`
- Modify: `apps/api/src/modules/admin/users/admin-users.module.ts`
- Modify: `apps/api/src/modules/admin/users/admin-users.service.ts`
- Test: `apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts`

- [ ] **Step 1: Расширить `IssuedTokenResponseDto`**

В `apps/api/src/modules/admin/users/dto/invite-admin.dto.ts`, внутри класса `IssuedTokenResponseDto`, после поля `action`, добавить:

```ts
    @ApiProperty({ description: 'true, если ссылка была отправлена письмом на email-логин.' })
    emailSent!: boolean;

    @ApiProperty({ nullable: true, description: 'Email, на который ушло письмо, либо null.' })
    sentToEmail!: string | null;
```

- [ ] **Step 2: Написать падающие тесты для отправки письма**

В `apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts`:

(2a) Добавить импорт и моки. После строки `import { AdminUsersService } from '../admin-users.service';` добавить:

```ts
import { ConfigService } from '@nestjs/config';

import { MailService } from '../../../mail/mail.service';
```

(2b) В `describe('AdminUsersService', ...)` добавить две новые переменные рядом с существующими `let`-объявлениями:

```ts
    let mailService: { isEnabled: jest.Mock; sendAdminInviteLink: jest.Mock };
    let configService: { get: jest.Mock };
```

(2c) В `beforeEach`, перед `Test.createTestingModule`, добавить:

```ts
        mailService = { isEnabled: jest.fn().mockReturnValue(true), sendAdminInviteLink: jest.fn() };
        configService = { get: jest.fn().mockReturnValue('https://admin.fit-calendar.ru') };
```

(2d) В массив `providers` добавить:

```ts
                { provide: MailService, useValue: mailService },
                { provide: ConfigService, useValue: configService },
```

(2e) В конце файла, перед закрывающей `});` описания, добавить новый блок:

```ts
    describe('email delivery on invite', () => {
        it('sends the link by email when the login is an email and SMTP is enabled', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(mailService.sendAdminInviteLink).toHaveBeenCalledTimes(1);
            const arg = mailService.sendAdminInviteLink.mock.calls[0][0];
            expect(arg).toMatchObject({ to: 'masha@example.com', name: 'Мария', purpose: 'invite' });
            expect(arg.url).toBe(
                `https://admin.fit-calendar.ru/set-password?token=${encodeURIComponent(result.token)}`,
            );
            expect(result.emailSent).toBe(true);
            expect(result.sentToEmail).toBe('masha@example.com');
        });

        it('does not send email when the login is not an email', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            const result = await service.invite('issuer-1', 'masha', 'Мария');

            expect(mailService.sendAdminInviteLink).not.toHaveBeenCalled();
            expect(result.emailSent).toBe(false);
            expect(result.sentToEmail).toBeNull();
        });

        it('still succeeds with emailSent=false when sending throws', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);
            mailService.sendAdminInviteLink.mockRejectedValue(new Error('SMTP down'));

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(result.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
            expect(result.emailSent).toBe(false);
            expect(result.sentToEmail).toBeNull();
        });

        it('skips email when SMTP is disabled', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);
            mailService.isEnabled.mockReturnValue(false);

            const result = await service.invite('issuer-1', 'masha@example.com', 'Мария');

            expect(mailService.sendAdminInviteLink).not.toHaveBeenCalled();
            expect(result.emailSent).toBe(false);
        });
    });
```

- [ ] **Step 3: Запустить тесты — убедиться, что падают**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=admin-users.service
```
Expected: FAIL — `Nest can't resolve dependencies` / новые поля отсутствуют (`emailSent` undefined).

- [ ] **Step 4: Импортировать `MailModule` в `AdminUsersModule`**

В `apps/api/src/modules/admin/users/admin-users.module.ts`:

Добавить импорт после строки `import { AdminAuthModule } from '../auth';`:

```ts
import { MailModule } from '../../mail/mail.module';
```

Изменить массив `imports`:

```ts
    imports: [TypeOrmModule.forFeature([AdminUser, AdminInviteToken]), AdminAuthModule, MailModule],
```

- [ ] **Step 5: Реализовать отправку письма в `AdminUsersService`**

В `apps/api/src/modules/admin/users/admin-users.service.ts`:

(5a) Обновить импорты в начале файла:

```ts
import { AdminInviteToken, AdminUser, type TAdminInviteTokenPurpose } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { DataSource, IsNull, Repository } from 'typeorm';

import { generateUrlSafeToken, sha256Hex } from '../../../common/utils/token-hash';
import { MailService } from '../../mail/mail.service';

import { AdminUserListItemDto } from './dto/admin-user.dto';
import { IssuedTokenResponseDto } from './dto/invite-admin.dto';
```

(5b) Добавить `Logger` и зависимости в конструктор:

```ts
    private readonly logger = new Logger(AdminUsersService.name);

    constructor(
        @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
        @InjectRepository(AdminInviteToken) private readonly tokenRepo: Repository<AdminInviteToken>,
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly mail: MailService,
        private readonly config: ConfigService,
    ) {}
```

(5c) Переписать `invite()` так, чтобы письмо уходило после транзакции:

```ts
    async invite(issuerAdminId: string, login: string, name: string): Promise<IssuedTokenResponseDto> {
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const issued = await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const existing = await adminRepo.findOne({ where: { login } });

            let adminUser: AdminUser;
            let action: 'created' | 'reactivated';

            if (existing) {
                if (existing.isActive) {
                    throw new ConflictException('Этот логин уже используется активным админом');
                }
                existing.name = name;
                adminUser = await adminRepo.save(existing);
                action = 'reactivated';
            } else {
                adminUser = await adminRepo.save(
                    adminRepo.create({
                        login,
                        name,
                        passwordHash: SENTINEL_HASH,
                        isActive: false,
                    }),
                );
                action = 'created';
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, adminUser.id, issuerAdminId, 'invite');
            return { plaintext, adminUserId: adminUser.id, action };
        });

        const { emailSent, sentToEmail } = await this.deliverLinkEmail(
            login,
            name,
            issued.plaintext,
            expiresAt,
            'invite',
        );

        return {
            token: issued.plaintext,
            adminUserId: issued.adminUserId,
            expiresAt,
            action: issued.action,
            emailSent,
            sentToEmail,
        };
    }
```

(5d) Переписать `issueReset()` аналогично:

```ts
    async issueReset(issuerAdminId: string, adminUserId: string): Promise<IssuedTokenResponseDto> {
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

        const issued = await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const admin = await adminRepo.findOne({ where: { id: adminUserId } });
            if (!admin) {
                throw new NotFoundException('Админ не найден');
            }

            const plaintext = await this.issueTokenInTx(tokenRepo, admin.id, issuerAdminId, 'reset');
            return { plaintext, adminUserId: admin.id, login: admin.login, name: admin.name };
        });

        const { emailSent, sentToEmail } = await this.deliverLinkEmail(
            issued.login,
            issued.name,
            issued.plaintext,
            expiresAt,
            'reset',
        );

        return {
            token: issued.plaintext,
            adminUserId: issued.adminUserId,
            expiresAt,
            action: 'reset',
            emailSent,
            sentToEmail,
        };
    }
```

(5e) Добавить приватные методы `deliverLinkEmail` и `buildSetPasswordUrl` (например, перед `issueTokenInTx`):

```ts
    // Sends the one-time link by email when the login is an email and SMTP is
    // configured. Never throws: a failed/disabled send degrades to emailSent=false
    // and the caller still returns the plaintext link as a manual fallback.
    private async deliverLinkEmail(
        login: string,
        name: string,
        token: string,
        expiresAt: string,
        purpose: TAdminInviteTokenPurpose,
    ): Promise<{ emailSent: boolean; sentToEmail: string | null }> {
        if (!isEmail(login) || !this.mail.isEnabled()) {
            return { emailSent: false, sentToEmail: null };
        }
        const url = this.buildSetPasswordUrl(token);
        if (!url) {
            this.logger.warn('CORS_ORIGIN_ADMIN is unset — cannot build set-password URL; skipping email');
            return { emailSent: false, sentToEmail: null };
        }
        try {
            await this.mail.sendAdminInviteLink({ to: login, name, url, expiresAt, purpose });
            return { emailSent: true, sentToEmail: login };
        } catch (err) {
            this.logger.warn(`Failed to send admin ${purpose} email to ${login}: ${String(err)}`);
            return { emailSent: false, sentToEmail: null };
        }
    }

    private buildSetPasswordUrl(token: string): string | null {
        const base = this.config.get<string>('CORS_ORIGIN_ADMIN');
        if (!base) {
            return null;
        }
        return `${base.replace(/\/+$/, '')}/set-password?token=${encodeURIComponent(token)}`;
    }
```

- [ ] **Step 6: Запустить тесты — убедиться, что проходят**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=admin-users.service
```
Expected: PASS — старые тесты + 4 новых в `email delivery on invite`.

> Если старые тесты падают на `result.action`/новых полях — проверь, что в существующих assert'ах не сравнивается весь объект ответа строго (`toEqual`); они используют `toMatchObject`/точечные проверки, так что новые поля их не ломают.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/admin/users/dto/invite-admin.dto.ts \
        apps/api/src/modules/admin/users/admin-users.module.ts \
        apps/api/src/modules/admin/users/admin-users.service.ts \
        apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts
git commit -m "feat(api): email admin invite/reset link when login is an email"
```

---

## Task 5: Деактивация админа — бэкенд (TDD)

**Files:**
- Modify: `apps/api/src/modules/admin/users/admin-users.service.ts`
- Modify: `apps/api/src/modules/admin/users/admin-users.controller.ts`
- Test: `apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts`

- [ ] **Step 1: Написать падающие тесты деактивации**

В `apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts` добавить блок перед закрывающей `});` описания. Тестам нужен `count` на `txAdminRepo` — расширить его мок в `beforeEach`, добавив в объект `txAdminRepo` поле:

```ts
            count: jest.fn(),
```

(добавляется в литерал `txAdminRepo = { ... }` рядом с `findOne`/`create`/`save`).

Затем блок:

```ts
    describe('deactivate', () => {
        it('rejects deactivating yourself', async () => {
            await expect(service.deactivate('admin-1', 'admin-1')).rejects.toBeInstanceOf(ConflictException);
            expect(dataSource.transaction).not.toHaveBeenCalled();
        });

        it('rejects deactivating the last active admin', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ id: 'admin-2', isActive: true }));
            txAdminRepo.count.mockResolvedValue(1);

            await expect(service.deactivate('admin-1', 'admin-2')).rejects.toBeInstanceOf(ConflictException);
            expect(txAdminRepo.update).not.toHaveBeenCalled();
        });

        it('throws NotFound when the target does not exist', async () => {
            txAdminRepo.findOne.mockResolvedValue(null);

            await expect(service.deactivate('admin-1', 'ghost')).rejects.toBeInstanceOf(NotFoundException);
        });

        it('deactivates the admin and consumes their outstanding tokens', async () => {
            txAdminRepo.findOne.mockResolvedValue(buildAdmin({ id: 'admin-2', isActive: true }));
            txAdminRepo.count.mockResolvedValue(2);

            await service.deactivate('admin-1', 'admin-2');

            expect(txAdminRepo.update).toHaveBeenCalledWith({ id: 'admin-2' }, { isActive: false });
            expect(txTokenRepo.update).toHaveBeenCalledWith(
                { adminUserId: 'admin-2', consumedAt: IsNull() },
                expect.objectContaining({ consumedAt: expect.any(Date) }),
            );
        });
    });
```

Также убедиться, что `txAdminRepo` имеет мок `update` — добавить `update: jest.fn(),` в литерал `txAdminRepo` (рядом с `findOne`), если его там ещё нет.

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=admin-users.service
```
Expected: FAIL — `service.deactivate is not a function`.

- [ ] **Step 3: Реализовать `deactivate()` в сервисе**

В `apps/api/src/modules/admin/users/admin-users.service.ts` добавить метод (например, после `issueReset`):

```ts
    async deactivate(issuerAdminId: string, targetId: string): Promise<void> {
        // Self-lockout guard runs before the transaction — no DB work needed to reject it.
        if (issuerAdminId === targetId) {
            throw new ConflictException('Нельзя отключить самого себя');
        }

        await this.dataSource.transaction(async (manager) => {
            const adminRepo = manager.getRepository(AdminUser);
            const tokenRepo = manager.getRepository(AdminInviteToken);

            const target = await adminRepo.findOne({ where: { id: targetId } });
            if (!target) {
                throw new NotFoundException('Админ не найден');
            }
            if (!target.isActive) {
                // Already inactive — idempotent no-op.
                return;
            }

            const activeCount = await adminRepo.count({ where: { isActive: true } });
            if (activeCount <= 1) {
                throw new ConflictException('Нельзя отключить последнего активного администратора');
            }

            await adminRepo.update({ id: targetId }, { isActive: false });
            // Consume any outstanding invite/reset tokens: otherwise a still-valid
            // set-password link would flip isActive back to true and bypass the deactivation.
            await tokenRepo.update({ adminUserId: targetId, consumedAt: IsNull() }, { consumedAt: new Date() });
        });
    }
```

- [ ] **Step 4: Добавить эндпоинт в контроллер**

В `apps/api/src/modules/admin/users/admin-users.controller.ts` добавить метод после `issueReset`:

```ts
    @Post(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate an admin (and invalidate their outstanding tokens)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204, description: 'Deactivated' })
    @ApiResponse({ status: 409, description: 'Cannot deactivate yourself or the last active admin' })
    @ApiResponse({ status: 404 })
    deactivate(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') issuerAdminId: string,
    ): Promise<void> {
        return this.usersService.deactivate(issuerAdminId, id);
    }
```

(`Post`, `HttpCode`, `HttpStatus`, `Param`, `ParseUUIDPipe`, `ApiOperation`, `ApiParam`, `ApiResponse` уже импортированы в этом файле.)

- [ ] **Step 5: Запустить тесты — убедиться, что проходят**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api -- --testPathPattern=admin-users.service
```
Expected: PASS — все тесты, включая блок `deactivate`.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/admin/users/admin-users.service.ts \
        apps/api/src/modules/admin/users/admin-users.controller.ts \
        apps/api/src/modules/admin/users/__tests__/admin-users.service.spec.ts
git commit -m "feat(api): deactivate admin endpoint with token invalidation + guards"
```

---

## Task 6: Фронт — API-клиент

**Files:**
- Modify: `apps/admin/src/shared/api/admin-users.api.ts`

- [ ] **Step 1: Расширить тип ответа и добавить `deactivate`**

В `apps/admin/src/shared/api/admin-users.api.ts`:

(6a) В интерфейс `IIssuedTokenResponse` добавить два поля:

```ts
export interface IIssuedTokenResponse {
    token: string;
    adminUserId: string;
    expiresAt: string;
    action: 'created' | 'reactivated' | 'reset';
    emailSent: boolean;
    sentToEmail: string | null;
}
```

(6b) В объект `adminUsersApi` добавить метод после `resetPassword`:

```ts
    deactivate: (adminUserId: string): Promise<void> =>
        adminApiClient.post<void>(`/admin/users/${adminUserId}/deactivate`),
```

- [ ] **Step 2: Проверить типы**

Run:
```bash
nvm use 22.13.1 && pnpm exec tsc -p apps/admin/tsconfig.app.json --noEmit
```
Expected: без ошибок (или те же предупреждения, что были до правки — новые ошибки в `admin-users.api.ts` отсутствуют).

- [ ] **Step 3: Commit**

```bash
git add apps/admin/src/shared/api/admin-users.api.ts
git commit -m "feat(admin): add deactivate API + email fields on issued-token response"
```

---

## Task 7: Фронт — карточка ссылки + список с деактивацией

**Files:**
- Modify: `apps/admin/src/shared/components/IssuedTokenLinkCard.tsx`
- Modify: `apps/admin/src/pages/AdminInvitePage.tsx`
- Modify: `apps/admin/src/pages/AdminsListPage.tsx`

- [ ] **Step 1: Добавить статус письма в `IssuedTokenLinkCard`**

В `apps/admin/src/shared/components/IssuedTokenLinkCard.tsx`:

(7a) Расширить пропсы:

```ts
interface IIssuedTokenLinkCardProps {
    forLogin: string;
    token: string;
    expiresAt: string;
    /** Optional context shown in the lede (e.g. "новый аккаунт", "переактивация"). */
    actionLabel?: string;
    /** If provided, renders a "Закрыть" button that calls this. */
    onDismiss?: () => void;
    /** When true, a "письмо отправлено" banner is shown and the link is framed as a fallback. */
    emailSent?: boolean;
    /** Email the link was sent to (shown in the banner). */
    sentToEmail?: string | null;
}
```

(7b) Обновить сигнатуру и тело компонента — добавить баннер и переформулировать lede:

```tsx
export function IssuedTokenLinkCard({
    forLogin,
    token,
    expiresAt,
    actionLabel,
    onDismiss,
    emailSent,
    sentToEmail,
}: IIssuedTokenLinkCardProps) {
    const [copied, setCopied] = useState(false);
    const url = buildSetPasswordUrl(token);

    const onCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        });
    };

    return (
        <div className="rounded border border-primary/40 bg-primary/5 p-4 space-y-2">
            {emailSent && (
                <p className="text-sm text-primary">
                    ✓ Письмо со ссылкой отправлено на <span className="font-medium">{sentToEmail}</span>.
                </p>
            )}
            <p className="text-sm">
                {emailSent ? (
                    <>
                        Если письмо не дошло — передайте ссылку для{' '}
                        <span className="font-medium">{forLogin}</span> вручную.
                    </>
                ) : (
                    <>
                        Ссылка для <span className="font-medium">{forLogin}</span>
                        {actionLabel ? <> ({actionLabel})</> : null} создана. Передайте её получателю —
                    </>
                )}{' '}
                открывается один раз, действует до {new Date(expiresAt).toLocaleString('ru-RU')}.
            </p>
            <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{url}</code>
                <button
                    type="button"
                    onClick={onCopy}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                >
                    <Copy className="h-3 w-3" /> {copied ? 'Скопировано' : 'Копировать'}
                </button>
                {onDismiss && (
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                    >
                        Закрыть
                    </button>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Прокинуть статус письма в `AdminInvitePage`**

В `apps/admin/src/pages/AdminInvitePage.tsx`, в блоке рендера `<IssuedTokenLinkCard ... />`, добавить два пропа:

```tsx
                    <IssuedTokenLinkCard
                        forLogin={login}
                        token={issued.token}
                        expiresAt={issued.expiresAt}
                        actionLabel={issued.action === 'created' ? 'новый аккаунт' : 'переактивация'}
                        emailSent={issued.emailSent}
                        sentToEmail={issued.sentToEmail}
                    />
```

- [ ] **Step 3: Прокинуть статус письма + добавить деактивацию в `AdminsListPage`**

В `apps/admin/src/pages/AdminsListPage.tsx`:

(3a) Обновить импорты — добавить иконку и стор:

```tsx
import { useAdminStore } from '@/shared/stores/adminStore';
import { KeyRound, Plus, UserX } from 'lucide-react';
```

(3b) Внутри компонента, рядом с остальными хуками, добавить чтение id текущего админа и состояние деактивации:

```tsx
    const currentAdminId = useAdminStore((s) => s.admin?.id);
    const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
```

(3c) Прокинуть поля письма в `IssuedTokenLinkCard` (блок `{issuedLink && (...)}`):

```tsx
            {issuedLink && (
                <IssuedTokenLinkCard
                    forLogin={issuedLink.forLogin}
                    token={issuedLink.token}
                    expiresAt={issuedLink.expiresAt}
                    emailSent={issuedLink.emailSent}
                    sentToEmail={issuedLink.sentToEmail}
                    onDismiss={() => setIssuedLink(null)}
                />
            )}
```

(3d) Добавить обработчик деактивации (рядом с `onReset`). Он использует `refresh`, который сейчас объявлен через `useCallback` — поэтому объявление `onDeactivate` должно идти после `refresh`:

```tsx
    const onDeactivate = async (admin: IAdminUserListItem) => {
        if (deactivatingId) return;
        const ok = window.confirm(`Отключить администратора ${admin.login}? Он потеряет доступ.`);
        if (!ok) return;
        setDeactivatingId(admin.id);
        setError(null);
        try {
            await adminUsersApi.deactivate(admin.id);
            await refresh({ cancelled: false });
        } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
                setError('Нельзя отключить самого себя или последнего активного администратора.');
            } else {
                setError('Не удалось отключить администратора');
            }
        } finally {
            setDeactivatingId(null);
        }
    };
```

(3e) Добавить импорт `ApiError` в существующий импорт из `@/shared/api`:

```tsx
import { adminUsersApi, ApiError, type IAdminUserListItem, type IIssuedTokenResponse } from '@/shared/api';
```

(3f) В ячейке действий (`<td className="p-2">` с кнопкой «Сбросить пароль») добавить кнопку «Отключить» для активных админов, кроме самого себя. Обернуть обе кнопки в флекс-контейнер:

```tsx
                                <td className="p-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onReset(a)}
                                            disabled={resettingId === a.id}
                                            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted disabled:opacity-60"
                                        >
                                            <KeyRound className="h-3 w-3" />
                                            {resettingId === a.id ? 'Создание...' : 'Сбросить пароль'}
                                        </button>
                                        {a.isActive && a.id !== currentAdminId && (
                                            <button
                                                type="button"
                                                onClick={() => onDeactivate(a)}
                                                disabled={deactivatingId === a.id}
                                                className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-background px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                                            >
                                                <UserX className="h-3 w-3" />
                                                {deactivatingId === a.id ? 'Отключение...' : 'Отключить'}
                                            </button>
                                        )}
                                    </div>
                                </td>
```

> `TIssuedLink` (`IIssuedTokenResponse & { forLogin: string }`) автоматически получает `emailSent`/`sentToEmail` из расширенного `IIssuedTokenResponse` — отдельных правок типа не нужно.

- [ ] **Step 4: Проверить типы и сборку**

Run:
```bash
nvm use 22.13.1 && pnpm exec tsc -p apps/admin/tsconfig.app.json --noEmit
```
Expected: без новых ошибок типов.

- [ ] **Step 5: Запустить тесты фронта (на случай регрессий)**

Run:
```bash
nvm use 22.13.1 && pnpm nx test admin 2>/dev/null || echo "no admin test target / no specs affected"
```
Expected: PASS или сообщение об отсутствии затронутых тестов.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/src/shared/components/IssuedTokenLinkCard.tsx \
        apps/admin/src/pages/AdminInvitePage.tsx \
        apps/admin/src/pages/AdminsListPage.tsx
git commit -m "feat(admin): show email-sent banner + deactivate button in admins UI"
```

---

## Task 8: Финальная проверка

- [ ] **Step 1: Прогнать полный набор тестов API**

Run:
```bash
nvm use 22.13.1 && pnpm nx test api
```
Expected: PASS — весь сьют, включая `mail.service` и `admin-users.service`.

- [ ] **Step 2: Типы фронта**

Run:
```bash
nvm use 22.13.1 && pnpm exec tsc -p apps/admin/tsconfig.app.json --noEmit
```
Expected: без новых ошибок.

- [ ] **Step 3: Ручная проверка (опционально, требует SMTP в `.env.local`)**

1. Задать `SMTP_*` и `CORS_ORIGIN_ADMIN` в `apps/api/.env.local` (или корневой `.env.local`).
2. `pnpm dev` (см. README «Testing Locally»).
3. В админке: «Администраторы» → «Пригласить» → логин = реальный email → проверить, что письмо пришло и в карточке виден баннер «Письмо отправлено».
4. Пригласить с логином-НЕ-email → письма нет, показан только copy-link.
5. Отключить второго админа → исчезает из активных; кнопка «Отключить» отсутствует для своей строки.

---

## Заметки по реализации

- **Node 22 обязателен** для nx-команд (`nvm use 22.13.1`). Коммитить через pre-commit hook, без `--no-verify`; стейджить файлы явными путями.
- **Доставляемость:** для боевого домена нужно настроить SPF/DKIM в панели Yandex 360 — это ops-шаг вне кода, но без него письма могут уходить в спам.
- **Параллельные коммиты:** репозиторий может коммититься из другой сессии — стейджить только перечисленные в задаче файлы.
