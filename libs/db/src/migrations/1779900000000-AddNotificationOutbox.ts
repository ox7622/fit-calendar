import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persisted outbox for out-of-band notifications (Story 5.4/5.5 follow-up).
 * Replaces the in-memory `withRetry` so an API restart mid-retry doesn't
 * lose messages. See `NotificationOutbox` entity for column rationale.
 */
export class AddNotificationOutbox1779900000000 implements MigrationInterface {
    name = 'AddNotificationOutbox1779900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "notification_outbox" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "customerId" uuid,
                "type" text NOT NULL,
                "payload" jsonb NOT NULL,
                "attemptCount" int NOT NULL DEFAULT 0,
                "nextAttemptAt" timestamptz NOT NULL,
                "status" text NOT NULL DEFAULT 'pending',
                "lastError" text,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_notification_outbox" PRIMARY KEY ("id"),
                CONSTRAINT "fk_notification_outbox_customer"
                    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
                    ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_outbox_due" ON "notification_outbox" ("status", "nextAttemptAt")`);
        await queryRunner.query(`CREATE INDEX "idx_outbox_customer" ON "notification_outbox" ("customerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_outbox_customer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_outbox_due"`);
        await queryRunner.query(`DROP TABLE "notification_outbox"`);
    }
}
