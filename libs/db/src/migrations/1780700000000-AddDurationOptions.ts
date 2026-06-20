import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin-managed allowed durations for schedule entries. Seeded with the same
 * `[30, 45, 60, 90]` minute values that were previously hardcoded so existing
 * UX is unchanged on release. `schedule_entries.durationMinutes` is not a FK —
 * it stays a plain int, so removing a duration option here never breaks
 * already-created classes.
 */
export class AddDurationOptions1780700000000 implements MigrationInterface {
    name = 'AddDurationOptions1780700000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "duration_options" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "valueMinutes" int NOT NULL,
                "sortOrder" int NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_duration_options" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_duration_options_value" ON "duration_options" ("valueMinutes")`,
        );

        await queryRunner.query(`
            INSERT INTO "duration_options" ("valueMinutes", "sortOrder") VALUES
                (30, 0),
                (45, 1),
                (60, 2),
                (90, 3)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_duration_options_value"`);
        await queryRunner.query(`DROP TABLE "duration_options"`);
    }
}
