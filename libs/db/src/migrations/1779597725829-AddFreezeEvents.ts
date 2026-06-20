import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFreezeEvents1779597725829 implements MigrationInterface {
    name = 'AddFreezeEvents1779597725829';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "freeze_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerMembershipId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "durationDays" integer NOT NULL, "notes" text, "recordedByAdminId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d9df70868140e564e63ecbfa2f7" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "idx_freeze_membership" ON "freeze_events" ("customerMembershipId") `);
        await queryRunner.query(
            `ALTER TABLE "freeze_events" ADD CONSTRAINT "FK_6d6651da6dae76a0a5233960bd3" FOREIGN KEY ("customerMembershipId") REFERENCES "customer_memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "freeze_events" DROP CONSTRAINT "FK_6d6651da6dae76a0a5233960bd3"`);
        await queryRunner.query(`DROP INDEX "public"."idx_freeze_membership"`);
        await queryRunner.query(`DROP TABLE "freeze_events"`);
    }
}
