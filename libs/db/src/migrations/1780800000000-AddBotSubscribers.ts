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
