import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerMemberships1779564795290 implements MigrationInterface {
    name = 'AddCustomerMemberships1779564795290';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "customer_memberships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" uuid NOT NULL, "planId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "guestVisitsRemaining" integer NOT NULL, "freezeDaysRemaining" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "notes" text, "createdByAdminId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_25f6c656b794fbf8d06222a240c" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "idx_membership_status" ON "customer_memberships" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_membership_customer" ON "customer_memberships" ("customerId") `);
        await queryRunner.query(
            `ALTER TABLE "customer_memberships" ADD CONSTRAINT "FK_d3426cc3679f25dd062d9e7b2df" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "customer_memberships" ADD CONSTRAINT "FK_993b57e29241d25555d0509f9da" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "customer_memberships" DROP CONSTRAINT "FK_993b57e29241d25555d0509f9da"`);
        await queryRunner.query(`ALTER TABLE "customer_memberships" DROP CONSTRAINT "FK_d3426cc3679f25dd062d9e7b2df"`);
        await queryRunner.query(`DROP INDEX "public"."idx_membership_customer"`);
        await queryRunner.query(`DROP INDEX "public"."idx_membership_status"`);
        await queryRunner.query(`DROP TABLE "customer_memberships"`);
    }
}
