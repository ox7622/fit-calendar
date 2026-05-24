import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuestVisits1779595938977 implements MigrationInterface {
    name = 'AddGuestVisits1779595938977';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "guest_visits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerMembershipId" uuid NOT NULL, "visitedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "notes" text, "recordedByAdminId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e34a5c2b1f312f21064ef1be43a" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_guest_visit_membership" ON "guest_visits" ("customerMembershipId") `,
        );
        await queryRunner.query(
            `ALTER TABLE "guest_visits" ADD CONSTRAINT "FK_fc28d58d382709e270d0b0d1f71" FOREIGN KEY ("customerMembershipId") REFERENCES "customer_memberships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "guest_visits" DROP CONSTRAINT "FK_fc28d58d382709e270d0b0d1f71"`);
        await queryRunner.query(`DROP INDEX "public"."idx_guest_visit_membership"`);
        await queryRunner.query(`DROP TABLE "guest_visits"`);
    }
}
