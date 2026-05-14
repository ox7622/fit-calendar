import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Story 7.2 — User → Customer rename + new admin-managed columns + reminders FK rename.
 *
 * Hand-authored because TypeORM's auto-gen for renames is unreliable (typically
 * emits drop-and-recreate, which would lose data). Constraint and index names
 * are taken from the InitialSchema migration.
 *
 * **Destructive:** wipes existing rows in `reminders` and `customers` (the renamed
 * `users` table) before adding the NOT NULL `phone` column. Safe pre-launch — Story 5.1
 * (Reminder Subscription) hasn't shipped, and the only `users` rows are seed/test data.
 * Re-seed afterwards via `pnpm db:seed`.
 */
export class RenameUsersToCustomers1778356800000 implements MigrationInterface {
    name = 'RenameUsersToCustomers1778356800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Drop the existing FK so we can rename the column safely.
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_f8e4bc520d9e692652afaf3308b"`);

        // 2. Rename the users table. PK and existing unique constraint names persist.
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "customers"`);

        // 3. Rename the telegram_id index (constraint names persist as-is in Postgres;
        //    indexes don't auto-rename when their owning table is renamed).
        await queryRunner.query(`ALTER INDEX "idx_users_telegram_id" RENAME TO "idx_customers_telegram_id"`);

        // 4. Wipe existing rows. The NOT NULL `phone` column we're about to add can't
        //    be back-filled meaningfully, and no real data exists pre-launch.
        await queryRunner.query(`DELETE FROM "reminders"`);
        await queryRunner.query(`DELETE FROM "customers"`);

        // 5. Add the new admin-managed columns.
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "phone" character varying(20) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "email" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "notes" text`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "telegramUsername" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "customers" ADD COLUMN "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "customers" ADD CONSTRAINT "UQ_customers_phone" UNIQUE ("phone")`);

        // 6. Make telegramId nullable. The existing UNIQUE constraint on it stays.
        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "telegramId" DROP NOT NULL`);

        // 7. Rename the reminders FK column + its index.
        await queryRunner.query(`ALTER TABLE "reminders" RENAME COLUMN "userId" TO "customerId"`);
        await queryRunner.query(`ALTER INDEX "idx_reminders_user" RENAME TO "idx_reminders_customer"`);
        // The (userId, scheduleEntryId) unique constraint UQ_76a8a95999621bb430a5982dcac
        // persists with its old name — Postgres tracks columns by attnum, not by name.

        // 8. Recreate the FK pointing to customers.id.
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_reminders_customer" ` +
                `FOREIGN KEY ("customerId") REFERENCES "customers"("id") ` +
                `ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverse of up(). Same caveat: rolling back wipes data.
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_reminders_customer"`);
        await queryRunner.query(`ALTER INDEX "idx_reminders_customer" RENAME TO "idx_reminders_user"`);
        await queryRunner.query(`ALTER TABLE "reminders" RENAME COLUMN "customerId" TO "userId"`);

        await queryRunner.query(`DELETE FROM "reminders"`);
        await queryRunner.query(`DELETE FROM "customers"`);

        await queryRunner.query(`ALTER TABLE "customers" ALTER COLUMN "telegramId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "UQ_customers_phone"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "telegramUsername"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "notes"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "phone"`);

        await queryRunner.query(`ALTER INDEX "idx_customers_telegram_id" RENAME TO "idx_users_telegram_id"`);
        await queryRunner.query(`ALTER TABLE "customers" RENAME TO "users"`);

        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_f8e4bc520d9e692652afaf3308b" ` +
                `FOREIGN KEY ("userId") REFERENCES "users"("id") ` +
                `ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }
}
