import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin accounts identify by a free-form `login` instead of an email. Fitness-club
 * staff often have no email at all, and the panel never sent mail — invite/reset
 * links are forwarded out-of-band — so the email column was only ever a credential,
 * not a delivery channel. A column RENAME preserves the existing row and its unique
 * index (a drop+add would null the live bootstrap admin and break NOT NULL/unique);
 * the seeded admin's value is normalized from the old address to plain `admin`.
 */
export class RenameAdminEmailToLogin1780500000000 implements MigrationInterface {
    name = 'RenameAdminEmailToLogin1780500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_users" RENAME COLUMN "email" TO "login"`);
        await queryRunner.query(`UPDATE "admin_users" SET "login" = 'admin' WHERE "login" = 'admin@fitcalendar.ru'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`UPDATE "admin_users" SET "login" = 'admin@fitcalendar.ru' WHERE "login" = 'admin'`);
        await queryRunner.query(`ALTER TABLE "admin_users" RENAME COLUMN "login" TO "email"`);
    }
}
