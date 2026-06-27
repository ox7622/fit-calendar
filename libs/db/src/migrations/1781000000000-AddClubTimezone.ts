import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Club timezone becomes a setting (single source of truth for all class-time
 * rendering). Existing singleton row defaults to Europe/Moscow — the value that
 * was previously hardcoded in the bot/formatters.
 */
export class AddClubTimezone1781000000000 implements MigrationInterface {
    name = 'AddClubTimezone1781000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "club_info" ADD COLUMN "timezone" varchar(64) NOT NULL DEFAULT 'Europe/Moscow'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "club_info" DROP COLUMN "timezone"`);
    }
}
