import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin-managed difficulty levels & impact types. Both tables reference-by-`key`
 * from `training_types` (`difficulty` string, `impactTypes` text[]), so we seed
 * the exact keys/labels/colours that were previously hardcoded — existing classes
 * keep working with no backfill, and the UI looks identical on release.
 *
 * Colours are palette tokens (see `TAXONOMY_COLORS` in @fitcalendar/shared):
 *   difficulty: beginner→green, intermediate→amber, advanced→red
 *   impact:     cardio→orange, strength→red, flexibility→green, balance→blue
 */
export class AddTaxonomyTables1780600000000 implements MigrationInterface {
    name = 'AddTaxonomyTables1780600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "difficulty_levels" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "key" varchar(50) NOT NULL,
                "label" varchar(100) NOT NULL,
                "color" varchar(20) NOT NULL,
                "sortOrder" int NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_difficulty_levels" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_difficulty_levels_key" ON "difficulty_levels" ("key")`);

        await queryRunner.query(`
            CREATE TABLE "impact_types" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "key" varchar(50) NOT NULL,
                "label" varchar(100) NOT NULL,
                "color" varchar(20) NOT NULL,
                "sortOrder" int NOT NULL DEFAULT 0,
                "isActive" boolean NOT NULL DEFAULT true,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                "updatedAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_impact_types" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_impact_types_key" ON "impact_types" ("key")`);

        // Seed today's hardcoded values so behaviour is unchanged on release.
        await queryRunner.query(`
            INSERT INTO "difficulty_levels" ("key", "label", "color", "sortOrder") VALUES
                ('beginner', 'Начальный', 'green', 0),
                ('intermediate', 'Средний', 'amber', 1),
                ('advanced', 'Продвинутый', 'red', 2)
        `);
        await queryRunner.query(`
            INSERT INTO "impact_types" ("key", "label", "color", "sortOrder") VALUES
                ('cardio', 'Кардио', 'orange', 0),
                ('strength', 'Силовая', 'red', 1),
                ('flexibility', 'Гибкость', 'green', 2),
                ('balance', 'Баланс', 'blue', 3)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_impact_types_key"`);
        await queryRunner.query(`DROP TABLE "impact_types"`);
        await queryRunner.query(`DROP INDEX "public"."idx_difficulty_levels_key"`);
        await queryRunner.query(`DROP TABLE "difficulty_levels"`);
    }
}
