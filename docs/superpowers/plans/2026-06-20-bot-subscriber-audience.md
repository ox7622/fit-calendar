# Bot-subscriber broadcast audience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broadcast schedule-change notifications to everyone who has contacted the bot or opened the Mini App (a new `bot_subscriber` audience), instead of only phone-linked customers.

**Architecture:** New `bot_subscriber` table + `BotSubscriberService`. Captured via a grammy middleware on the API webhook bot (`/start` + any message) and in the Mini App's `/me` bootstrap. The broadcast listener targets active subscribers; `/stop` and a 403-on-send both auto-deactivate. A migration backfills from linked customers.

**Tech Stack:** NestJS + TypeORM + grammy (API), Jest, Nx (Node 22 — `nvm use 22.13.1`).

**Spec:** `docs/superpowers/specs/2026-06-20-bot-subscriber-audience-design.md`

**Pre-req for every command:** `source ~/.nvm/nvm.sh && nvm use 22.13.1`.

> **Deploy note:** unlike the previous two features, this adds a **new table → migration**. On prod deploy the API container auto-runs `db:migrate:prod` at boot.

> **`source` field semantics:** stored as the *most recent* contact channel (`'bot' | 'mini_app'`) — `repo.upsert` overwrites it on each contact. (Spec said "first captured"; most-recent is simpler and equally useful — analytics only.)

---

### Task 1: `bot_subscriber` entity + data-source + migration (with backfill)

**Files:**
- Create: `libs/db/src/entities/bot-subscriber.entity.ts`
- Modify: `libs/db/src/entities/index.ts`
- Modify: `libs/db/src/data-source.ts`
- Create: `libs/db/src/migrations/1780800000000-AddBotSubscribers.ts`

- [ ] **Step 1: Create the entity**

```ts
// libs/db/src/entities/bot-subscriber.entity.ts
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type TBotSubscriberSource = 'bot' | 'mini_app';

/**
 * Everyone who has contacted the bot (/start, any message) or opened the Mini App.
 * The broadcast audience for schedule-change notifications — separate from `customers`
 * because a subscriber need not be a customer (and `customers.phone` is NOT NULL UNIQUE,
 * so a bot-only contact can't live there).
 */
@Entity('bot_subscribers')
export class BotSubscriber {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // bigint maps to string in JS; the service Number()s it on read (same as customers.telegramId).
    @Column({ type: 'bigint', unique: true })
    telegramId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    username: string | null;

    /** Most recent channel the contact was seen on. */
    @Column({ type: 'text' })
    source: TBotSubscriberSource;

    @Column({ type: 'boolean', default: true })
    @Index('idx_bot_subscribers_active')
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;
}
```

- [ ] **Step 2: Export it from the entities barrel**

In `libs/db/src/entities/index.ts`, append:
```ts
export * from './bot-subscriber.entity';
```

- [ ] **Step 3: Register it in `libs/db/src/data-source.ts`**

Add `BotSubscriber` to the import block (keep alphabetical-ish with the others) and to the `entities` array:
```ts
import {
    AdminAuditLog,
    AdminUser,
    BotSubscriber,
    ClubInfo,
    Coach,
    Customer,
    DifficultyLevel,
    ImpactType,
    MembershipPlan,
    NotificationOutbox,
    Reminder,
    ScheduleEntry,
    TrainingType,
} from './entities';

export const entities = [
    Customer,
    Coach,
    TrainingType,
    DifficultyLevel,
    ImpactType,
    ScheduleEntry,
    Reminder,
    ClubInfo,
    AdminUser,
    MembershipPlan,
    AdminAuditLog,
    NotificationOutbox,
    BotSubscriber,
];
```
(The migration data-source in `libs/nest-shared/src/db/data-source.ts` globs `**/*.entity.ts`, so no change needed there.)

- [ ] **Step 4: Create the migration**

```ts
// libs/db/src/migrations/1780800000000-AddBotSubscribers.ts
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bot subscribers = the broadcast audience. Backfilled from customers who already
 * linked Telegram (they, by definition, started the bot). Future contacts are
 * captured live by the API bot middleware + Mini App bootstrap.
 */
export class AddBotSubscribers1780800000000 implements MigrationInterface {
    name = 'AddBotSubscribers1780800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "bot_subscribers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "telegramId" bigint NOT NULL,
                "firstName" varchar(255),
                "username" varchar(255),
                "source" text NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_bot_subscribers" PRIMARY KEY ("id"),
                CONSTRAINT "uq_bot_subscribers_telegram_id" UNIQUE ("telegramId")
            )
        `);
        await queryRunner.query(`CREATE INDEX "idx_bot_subscribers_active" ON "bot_subscribers" ("isActive")`);
        await queryRunner.query(`
            INSERT INTO "bot_subscribers" ("telegramId", "firstName", "source", "isActive")
            SELECT "telegramId", "firstName", 'bot', true
            FROM "customers"
            WHERE "telegramId" IS NOT NULL
            ON CONFLICT ("telegramId") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "bot_subscribers"`);
    }
}
```

- [ ] **Step 5: Build + apply the migration locally**

Run:
```bash
npx nx build db
echo "yes" | pnpm mig:up
```
Expected: build succeeds; migration `AddBotSubscribers1780800000000` runs. Verify the table + backfill:
```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d fitcalendar -c '\d bot_subscribers' -c 'SELECT count(*) FROM bot_subscribers;'
```
Expected: table exists; count = number of local customers with a telegramId (often 0 — fine).

- [ ] **Step 6: Commit**
```bash
git add libs/db/src/entities/bot-subscriber.entity.ts libs/db/src/entities/index.ts libs/db/src/data-source.ts libs/db/src/migrations/1780800000000-AddBotSubscribers.ts
git commit -m "feat(db): add bot_subscribers table + backfill from linked customers"
```

---

### Task 2: `BotSubscriberService` + module

**Files:**
- Create: `apps/api/src/modules/bot-subscriber/bot-subscriber.service.ts`
- Create: `apps/api/src/modules/bot-subscriber/bot-subscriber.module.ts`
- Test: `apps/api/src/modules/bot-subscriber/__tests__/bot-subscriber.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/bot-subscriber/__tests__/bot-subscriber.service.spec.ts
import { BotSubscriber } from '@fitcalendar/db';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { BotSubscriberService } from '../bot-subscriber.service';

describe('BotSubscriberService', () => {
    let service: BotSubscriberService;
    let repo: { upsert: jest.Mock; update: jest.Mock; createQueryBuilder: jest.Mock };
    let getRawMany: jest.Mock;

    beforeEach(async () => {
        getRawMany = jest.fn().mockResolvedValue([{ telegramId: '111' }, { telegramId: '222' }]);
        repo = {
            upsert: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                getRawMany,
            }),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotSubscriberService, { provide: getRepositoryToken(BotSubscriber), useValue: repo }],
        }).compile();
        service = module.get(BotSubscriberService);
    });

    it('upsert inserts/reactivates by telegramId with isActive=true', async () => {
        await service.upsert({ telegramId: 111, firstName: 'Анна', username: 'anna', source: 'bot' });
        expect(repo.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 111, isActive: true, source: 'bot', firstName: 'Анна' }),
            ['telegramId'],
        );
    });

    it('deactivate flips isActive to false for the telegramId', async () => {
        await service.deactivate(111);
        expect(repo.update).toHaveBeenCalledWith({ telegramId: 111 }, { isActive: false });
    });

    it('findActiveRecipients returns numeric telegramIds for active rows', async () => {
        const result = await service.findActiveRecipients();
        expect(result).toEqual([{ telegramId: 111 }, { telegramId: 222 }]);
    });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npx nx test api --testFile=bot-subscriber.service`
Expected: FAIL — cannot find `../bot-subscriber.service`.

- [ ] **Step 3: Implement the service**

```ts
// apps/api/src/modules/bot-subscriber/bot-subscriber.service.ts
import { BotSubscriber, type TBotSubscriberSource } from '@fitcalendar/db';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface IUpsertSubscriberInput {
    telegramId: number;
    firstName?: string | null;
    username?: string | null;
    source: TBotSubscriberSource;
}

@Injectable()
export class BotSubscriberService {
    constructor(
        @InjectRepository(BotSubscriber)
        private readonly repo: Repository<BotSubscriber>,
    ) {}

    /** Records a contact: inserts a new subscriber or refreshes + re-activates an existing one. */
    async upsert(input: IUpsertSubscriberInput): Promise<void> {
        await this.repo.upsert(
            {
                telegramId: input.telegramId,
                firstName: input.firstName ?? null,
                username: input.username ?? null,
                source: input.source,
                isActive: true,
            },
            ['telegramId'],
        );
    }

    async deactivate(telegramId: number): Promise<void> {
        await this.repo.update({ telegramId }, { isActive: false });
    }

    /** Active broadcast audience: telegram ids of every subscriber who hasn't opted out. */
    async findActiveRecipients(): Promise<{ telegramId: number }[]> {
        const rows = await this.repo
            .createQueryBuilder('s')
            .select('s.telegramId', 'telegramId')
            .where('s.isActive = true')
            .getRawMany<{ telegramId: string }>();
        return rows.map((r) => ({ telegramId: Number(r.telegramId) }));
    }
}
```

- [ ] **Step 4: Create the module**

```ts
// apps/api/src/modules/bot-subscriber/bot-subscriber.module.ts
import { BotSubscriber } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BotSubscriberService } from './bot-subscriber.service';

@Module({
    imports: [TypeOrmModule.forFeature([BotSubscriber])],
    providers: [BotSubscriberService],
    exports: [BotSubscriberService],
})
export class BotSubscriberModule {}
```

- [ ] **Step 5: Run test + build**

Run: `npx nx test api --testFile=bot-subscriber.service` → PASS (3).
Run: `npx nx build api` → succeeds.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/modules/bot-subscriber/
git commit -m "feat(api): add BotSubscriberService (upsert/deactivate/findActiveRecipients)"
```

---

### Task 3: Capture contacts in the bot (middleware) + `/stop`

**Files:**
- Create: `apps/api/src/modules/bot/handlers/contact-capture.handler.ts`
- Create: `apps/api/src/modules/bot/handlers/stop.handler.ts`
- Create: `apps/api/src/modules/bot/handlers/__tests__/contact-capture.handler.spec.ts`
- Create: `apps/api/src/modules/bot/handlers/__tests__/stop.handler.spec.ts`
- Modify: `apps/api/src/modules/bot/bot.module.ts`
- Modify: `apps/api/src/modules/bot/bot.service.ts`

- [ ] **Step 1: Write failing tests**

```ts
// apps/api/src/modules/bot/handlers/__tests__/contact-capture.handler.spec.ts
import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../../bot-subscriber/bot-subscriber.service';
import { registerContactCapture } from '../contact-capture.handler';

function makeBot() {
    const handlers: { middleware?: (ctx: Context, next: () => Promise<void>) => Promise<void> } = {};
    const bot = { use: jest.fn((fn) => (handlers.middleware = fn)) } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerContactCapture', () => {
    let subscribers: { upsert: jest.Mock };
    beforeEach(() => (subscribers = { upsert: jest.fn().mockResolvedValue(undefined) }));

    it('upserts the human sender then calls next', async () => {
        const { bot, handlers } = makeBot();
        registerContactCapture(bot, subscribers as unknown as BotSubscriberService);
        const next = jest.fn().mockResolvedValue(undefined);
        await handlers.middleware!(
            { from: { id: 5, first_name: 'Ия', username: 'iya', is_bot: false } } as unknown as Context,
            next,
        );
        expect(subscribers.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ telegramId: 5, source: 'bot', firstName: 'Ия', username: 'iya' }),
        );
        expect(next).toHaveBeenCalled();
    });

    it('skips upsert for bot senders / missing from, still calls next', async () => {
        const { bot, handlers } = makeBot();
        registerContactCapture(bot, subscribers as unknown as BotSubscriberService);
        const next = jest.fn().mockResolvedValue(undefined);
        await handlers.middleware!({ from: { id: 9, is_bot: true } } as unknown as Context, next);
        await handlers.middleware!({} as unknown as Context, next);
        expect(subscribers.upsert).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(2);
    });
});
```

```ts
// apps/api/src/modules/bot/handlers/__tests__/stop.handler.spec.ts
import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../../bot-subscriber/bot-subscriber.service';
import { registerStopCommand } from '../stop.handler';

function makeBot() {
    const handlers: { command: Record<string, (ctx: Context) => Promise<void>> } = { command: {} };
    const bot = {
        command: jest.fn((name: string, fn: (ctx: Context) => Promise<void>) => (handlers.command[name] = fn)),
    } as unknown as Bot<Context>;
    return { bot, handlers };
}

describe('registerStopCommand', () => {
    it('/stop deactivates the sender and replies', async () => {
        const subscribers = { deactivate: jest.fn().mockResolvedValue(undefined) };
        const { bot, handlers } = makeBot();
        registerStopCommand(bot, subscribers as unknown as BotSubscriberService);
        const reply = jest.fn().mockResolvedValue(undefined);
        await handlers.command['stop']({ from: { id: 7 }, reply } as unknown as Context);
        expect(subscribers.deactivate).toHaveBeenCalledWith(7);
        expect(reply).toHaveBeenCalledWith(expect.stringContaining('отписались'));
    });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx nx test api --testFile=contact-capture.handler` and `--testFile=stop.handler`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the capture middleware**

```ts
// apps/api/src/modules/bot/handlers/contact-capture.handler.ts
import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';

/**
 * Records every human who contacts the bot (any update with a `from`) as a
 * subscriber. Best-effort: capture failure never blocks update handling.
 * MUST be registered BEFORE command handlers so `/start` re-activates first.
 */
export function registerContactCapture(bot: Bot<Context>, subscribers: BotSubscriberService): void {
    bot.use(async (ctx, next) => {
        const from = ctx.from;
        if (from && !from.is_bot) {
            await subscribers
                .upsert({
                    telegramId: from.id,
                    firstName: from.first_name ?? null,
                    username: from.username ?? null,
                    source: 'bot',
                })
                .catch(() => undefined);
        }
        await next();
    });
}
```

- [ ] **Step 4: Implement `/stop`**

```ts
// apps/api/src/modules/bot/handlers/stop.handler.ts
import type { Bot, Context } from 'grammy';

import type { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';

/** Lets a user opt out of broadcasts. /start re-subscribes via the capture middleware. */
export function registerStopCommand(bot: Bot<Context>, subscribers: BotSubscriberService): void {
    bot.command('stop', async (ctx) => {
        if (ctx.from) {
            await subscribers.deactivate(ctx.from.id);
        }
        await ctx.reply('Вы отписались от уведомлений. Отправьте /start, чтобы снова их включить.');
    });
}
```

- [ ] **Step 5: Wire into `BotModule` + `BotService`**

In `bot.module.ts`, import the subscriber module:
```ts
import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';
```
and add it to `imports`: `imports: [ConfigModule, ScheduleModule, ClubModule, BotSubscriberModule],`

In `bot.service.ts`:
- Add imports:
```ts
import { BotSubscriberService } from '../bot-subscriber/bot-subscriber.service';
import { registerContactCapture } from './handlers/contact-capture.handler';
import { registerStopCommand } from './handlers/stop.handler';
```
- Add to the constructor (after `clubService`):
```ts
        private readonly botSubscribers: BotSubscriberService,
```
- In `onModuleInit`, register capture FIRST (right after the `this.bot.catch(...)` block, before `registerStartCommand`):
```ts
        // Record every human contact as a subscriber. BEFORE commands so /start re-activates.
        registerContactCapture(this.bot, this.botSubscribers);
```
- Register `/stop` alongside the other command registrations (after `registerClubCommand`):
```ts
        registerStopCommand(this.bot, this.botSubscribers);
```

- [ ] **Step 6: Run tests + build**

Run: `npx nx test api --testFile=contact-capture.handler` → PASS (2); `--testFile=stop.handler` → PASS (1).
Run: `npx nx build api` → succeeds. `npx nx lint api` → clean.

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/modules/bot/handlers/contact-capture.handler.ts apps/api/src/modules/bot/handlers/stop.handler.ts apps/api/src/modules/bot/handlers/__tests__/ apps/api/src/modules/bot/bot.module.ts apps/api/src/modules/bot/bot.service.ts
git commit -m "feat(api): capture bot contacts as subscribers + /stop opt-out"
```

---

### Task 4: Capture Mini-App opens in `/me`

**Files:**
- Modify: `apps/api/src/modules/customer/me.controller.ts`
- Modify: `apps/api/src/modules/customer/customer.module.ts`
- Test: `apps/api/src/modules/customer/__tests__/me.controller.spec.ts` (create if absent; otherwise add a case)

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/customer/__tests__/me.controller.spec.ts
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
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx nx test api --testFile=me.controller`
Expected: FAIL — `MeController` constructor takes one arg / no capture yet.

- [ ] **Step 3: Inject `BotSubscriberService` and capture in `getMe`**

In `me.controller.ts`:
- Add import: `import { BotSubscriberService } from '../bot-subscriber/bot-subscriber.service';`
- Change the constructor:
```ts
    constructor(
        private readonly customerService: CustomerService,
        private readonly botSubscribers: BotSubscriberService,
    ) {}
```
- In `getMe`, before the return, fire-and-forget the capture (must not slow or fail the response):
```ts
        void this.botSubscribers
            .upsert({
                telegramId: identity.id,
                firstName: identity.first_name ?? null,
                username: identity.username ?? null,
                source: 'mini_app',
            })
            .catch(() => undefined);
```
(Place it as the first statement in `getMe`, before the `if (customer)` branch, so it runs on both linked and unlinked callers.)

- [ ] **Step 4: Import the subscriber module in `CustomerModule`**

In `customer.module.ts`, add:
```ts
import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';
```
and add `BotSubscriberModule` to the module's `imports` array.

- [ ] **Step 5: Run test + build + lint**

Run: `npx nx test api --testFile=me.controller` → PASS.
Run: `npx nx build api` → succeeds. `npx nx lint api` → clean.

- [ ] **Step 6: Commit**
```bash
git add apps/api/src/modules/customer/me.controller.ts apps/api/src/modules/customer/customer.module.ts apps/api/src/modules/customer/__tests__/me.controller.spec.ts
git commit -m "feat(api): capture mini-app opens as bot subscribers"
```

---

### Task 5: Point the broadcast at active subscribers

**Files:**
- Modify: `apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts`
- Modify: `apps/api/src/modules/reminder/reminder.module.ts`
- Modify: `apps/api/src/modules/reminder/__tests__/schedule-notification.listener.spec.ts`
- Modify: `apps/api/src/modules/customer/customer.service.ts` (remove dead `findBroadcastRecipients`)
- Delete: `apps/api/src/modules/customer/__tests__/customer-broadcast-recipients.spec.ts`

- [ ] **Step 1: Update the listener test to use the subscriber service**

In `schedule-notification.listener.spec.ts`:
- Replace the `customerService` mock with a `botSubscriberService` mock. Change the setup:
```ts
    let botSubscriberService: { findActiveRecipients: jest.Mock };
```
```ts
        botSubscriberService = {
            findActiveRecipients: jest.fn().mockResolvedValue([{ telegramId: 111 }, { telegramId: 222 }]),
        };
```
- In the testing module providers, replace the `CustomerService` provider with:
```ts
                { provide: BotSubscriberService, useValue: botSubscriberService },
```
  and update the import at the top: remove `CustomerService`, add
  `import { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';`
- The "created: enqueues one row per recipient" test asserts `customerId: 'c1'`. Change that assertion to `customerId: null` (subscribers aren't customers):
```ts
        expect(first).toMatchObject({ customerId: null, type: 'schedule_created' });
```
- The "no recipients" test: change `customerService.findBroadcastRecipients` → `botSubscriberService.findActiveRecipients`.

- [ ] **Step 2: Run, verify FAIL**

Run: `npx nx test api --testFile=schedule-notification.listener`
Expected: FAIL — listener still injects `CustomerService` / enqueues `recipient.id`.

- [ ] **Step 3: Update the listener**

In `schedule-notification.listener.ts`:
- Replace the import `import { CustomerService } from '../../customer/customer.service';` with
  `import { BotSubscriberService } from '../../bot-subscriber/bot-subscriber.service';`
- Constructor: replace `private readonly customerService: CustomerService,` with
  `private readonly botSubscribers: BotSubscriberService,`
- In `broadcast()`, change the recipient fetch + enqueue:
```ts
        const recipients = await this.botSubscribers.findActiveRecipients();
        if (recipients.length === 0) return;

        const webAppUrl = this.miniAppUrl ? `${this.miniAppUrl}/schedule/${opts.scheduleEntryId}` : undefined;

        await Promise.all(
            recipients.map((recipient) =>
                this.outboxService
                    .enqueue({
                        customerId: null,
                        type: opts.type,
                        payload: {
                            telegramId: recipient.telegramId,
                            text: opts.text,
                            webAppUrl,
                            scheduleEntryId: opts.scheduleEntryId,
                        },
                    })
                    .catch((err) => {
                        this.logger.error(
                            {
                                event: 'schedule.broadcast.enqueue_failed',
                                type: opts.type,
                                scheduleEntryId: opts.scheduleEntryId,
                                telegramId: recipient.telegramId,
                                error: err instanceof Error ? err.message : String(err),
                            },
                            'Failed to enqueue schedule broadcast notification',
                        );
                    }),
            ),
        );
```

- [ ] **Step 4: Import `BotSubscriberModule` in `ReminderModule`**

In `reminder.module.ts`, add:
```ts
import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';
```
and add `BotSubscriberModule` to the `imports` array (next to `BotModule`).

- [ ] **Step 5: Remove the now-dead `findBroadcastRecipients`**

In `customer.service.ts`, delete the `findBroadcastRecipients` method (the one filtering `telegramId IS NOT NULL AND isActive = true`). Then delete its test file:
```bash
git rm apps/api/src/modules/customer/__tests__/customer-broadcast-recipients.spec.ts
```
Confirm no other references: `grep -rn findBroadcastRecipients apps/api/src` → only matches should be gone.

- [ ] **Step 6: Run tests + build + lint**

Run: `npx nx test api --testFile=schedule-notification.listener` → PASS (incl. duration-only case).
Run: `npx nx test api` → all green. `npx nx build api` → succeeds. `npx nx lint api` → clean (drop any now-unused imports the linter flags).

- [ ] **Step 7: Commit**
```bash
git add apps/api/src/modules/reminder/listeners/schedule-notification.listener.ts apps/api/src/modules/reminder/reminder.module.ts apps/api/src/modules/reminder/__tests__/schedule-notification.listener.spec.ts apps/api/src/modules/customer/customer.service.ts
git commit -m "feat(api): broadcast to active bot subscribers instead of linked customers"
```

---

### Task 6: Auto-deactivate subscribers on permanent (403) send failure

**Files:**
- Modify: `apps/api/src/modules/reminder/notification-outbox-dispatcher.service.ts`
- Modify: `apps/api/src/modules/reminder/__tests__/notification-outbox-dispatcher.service.spec.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

> The dispatcher already classifies "permanent" errors via `BotService.isPermanentSendError`. This test verifies that on a permanent failure the subscriber is deactivated by `telegramId`. Build the testing module with mocked `NotificationOutboxService`, `BotService`, and `BotSubscriberService`. If a spec file already exists, add this case into it reusing its setup.

```ts
// apps/api/src/modules/reminder/__tests__/notification-outbox-dispatcher.service.spec.ts
import { GrammyError } from 'grammy';

// Build the dispatcher with mocked deps (mirror the existing reminder-dispatcher spec style):
//   - outboxService: { findDue: jest.fn().mockResolvedValue([row]), markSent, recordFailure }
//   - botService: { sendNotification: jest.fn().mockRejectedValue(forbiddenError), isPermanentSendError? }
//   - botSubscribers: { deactivate: jest.fn() }
// where `row.payload.telegramId = 111` and forbiddenError is a 403 GrammyError.
//
// Assert after one tick():
//   expect(botSubscribers.deactivate).toHaveBeenCalledWith(111);
//   expect(outboxService.recordFailure).toHaveBeenCalled(); // terminal failure
```

Concrete test (adapt provider wiring to the existing dispatcher constructor):
```ts
it('deactivates the subscriber on a permanent (403) send failure', async () => {
    const forbidden = new GrammyError(
        'Forbidden: bot was blocked by the user',
        { ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' } as never,
        'sendMessage',
        {},
    );
    const row = { id: 'o1', attemptCount: 0, type: 'schedule_changed', payload: { telegramId: 111, text: 'x' } };
    outboxService.findDue.mockResolvedValueOnce([row]);
    botService.sendNotification.mockRejectedValueOnce(forbidden);

    await dispatcher.tick();

    expect(botSubscribers.deactivate).toHaveBeenCalledWith(111);
    expect(outboxService.recordFailure).toHaveBeenCalledWith('o1', Number.MAX_SAFE_INTEGER, forbidden);
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `npx nx test api --testFile=notification-outbox-dispatcher`
Expected: FAIL — dispatcher doesn't inject/call `botSubscribers.deactivate`.

- [ ] **Step 3: Inject `BotSubscriberService` + deactivate on permanent failure**

In `notification-outbox-dispatcher.service.ts`:
- Add import: `import { BotSubscriberService } from '../bot-subscriber/bot-subscriber.service';`
- Add it to the constructor params (alongside `outboxService` and `botService`):
```ts
        private readonly botSubscribers: BotSubscriberService,
```
- In `handleSendFailure`, inside the `if (isPermanent) { ... }` block, deactivate before recording the terminal failure:
```ts
        if (isPermanent) {
            // User blocked the bot or chat doesn't exist — stop targeting them and
            // short-circuit retries. Force the row to terminal 'failed'.
            await this.botSubscribers.deactivate(row.payload.telegramId);
            await this.outboxService.recordFailure(row.id, Number.MAX_SAFE_INTEGER, err);
            return;
        }
```
(`BotSubscriberModule` is already imported by `ReminderModule` from Task 5, so the provider resolves.)

- [ ] **Step 4: Run test + full api suite + build + lint**

Run: `npx nx test api --testFile=notification-outbox-dispatcher` → PASS.
Run: `npx nx test api` → all green. `npx nx build api` → succeeds. `npx nx lint api` → clean.

- [ ] **Step 5: Commit**
```bash
git add apps/api/src/modules/reminder/notification-outbox-dispatcher.service.ts apps/api/src/modules/reminder/__tests__/notification-outbox-dispatcher.service.spec.ts
git commit -m "feat(api): deactivate bot subscriber on permanent send failure"
```

---

## Final verification

- [ ] **Sweep**
```bash
npx nx run-many -t test lint build -p db api
```
Expected: all green. (`mig:up` already applied locally in Task 1; the migration also runs automatically on prod API boot at deploy.)

- [ ] **Manual smoke (after deploy, safe):** `/start` the prod bot → row appears in `bot_subscribers` (active). `/stop` → row `isActive=false`, bot confirms. `/start` again → re-activated. An in-window schedule edit with "notify" checked now enqueues outbox rows for active subscribers.

---

## Notes / out of scope
- Dev/staging polling bot doesn't capture (no DB); the prod webhook bot + Mini App cover prod.
- No audience segmentation, no subscriber-list admin screen, no re-enabling phone linking (separate decisions).
- Reminders (per-class) still target `customer.telegramId` — unchanged.
