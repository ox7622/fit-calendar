import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMembershipPlans1778355591678 implements MigrationInterface {
    name = 'AddMembershipPlans1778355591678';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "membership_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "durationValue" integer NOT NULL, "durationUnit" character varying(10) NOT NULL, "priceRub" integer NOT NULL, "features" text array NOT NULL DEFAULT '{}', "guestVisitsAllowed" integer NOT NULL DEFAULT '0', "freezeDaysAllowed" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_85ca9d6f4262a6bbff2a540c640" PRIMARY KEY ("id"))`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "membership_plans"`);
    }
}
