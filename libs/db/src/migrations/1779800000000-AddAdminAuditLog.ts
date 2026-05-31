import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only audit trail for destructive admin actions (deletes, cancels).
 * Used for compliance + forensics. The `adminUserId` FK uses ON DELETE SET
 * NULL so removing an admin doesn't lose history. Composite indexes target
 * the two query shapes a future admin UI will need: "what did admin X do?"
 * and "what touched resource Y?"
 */
export class AddAdminAuditLog1779800000000 implements MigrationInterface {
    name = 'AddAdminAuditLog1779800000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "admin_audit_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "adminUserId" uuid,
                "action" text NOT NULL,
                "resourceType" text NOT NULL,
                "resourceId" text NOT NULL,
                "metadata" jsonb,
                "ipAddress" inet,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_admin_audit_log" PRIMARY KEY ("id"),
                CONSTRAINT "fk_admin_audit_log_admin_user"
                    FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id")
                    ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(
            `CREATE INDEX "idx_admin_audit_admin_created" ON "admin_audit_log" ("adminUserId", "createdAt")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_admin_audit_resource" ON "admin_audit_log" ("resourceType", "resourceId")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_admin_audit_resource"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_audit_admin_created"`);
        await queryRunner.query(`DROP TABLE "admin_audit_log"`);
    }
}
