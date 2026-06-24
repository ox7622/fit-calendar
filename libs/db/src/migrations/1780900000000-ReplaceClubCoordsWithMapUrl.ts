import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drops the latitude/longitude pair on club_info in favour of a single mapUrl
 * field the admin pastes by hand. Existing coords are converted to a Yandex
 * Maps pin URL so already-deployed clubs don't lose their "open on map" link.
 */
export class ReplaceClubCoordsWithMapUrl1780900000000 implements MigrationInterface {
    name = 'ReplaceClubCoordsWithMapUrl1780900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "club_info" ADD COLUMN "mapUrl" varchar(500)`);
        await queryRunner.query(`
            UPDATE "club_info"
            SET "mapUrl" = 'https://yandex.ru/maps/?pt=' || "longitude" || ',' || "latitude" || '&z=16'
            WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL
        `);
        await queryRunner.query(`ALTER TABLE "club_info" DROP COLUMN "latitude", DROP COLUMN "longitude"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "club_info" ADD COLUMN "latitude" numeric(10,8), ADD COLUMN "longitude" numeric(11,8), DROP COLUMN "mapUrl"`,
        );
    }
}
