import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One-time tokens that back invite + reset flows on the admin panel. See
 * `admin-invite-token.entity.ts` for the storage contract (sha256 of plaintext,
 * 24h TTL set by the issuing service). FKs:
 *   - adminUserId ON DELETE CASCADE: a token is meaningless without its admin.
 *   - issuedByAdminId ON DELETE SET NULL: keep history if the issuer is later removed.
 * Partial index targets "find any open token for this admin" — used to
 * invalidate prior outstanding tokens when a new one is issued.
 */
export class AddAdminInviteTokens1780346367222 implements MigrationInterface {
    name = 'AddAdminInviteTokens1780346367222';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "admin_invite_tokens" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "adminUserId" uuid NOT NULL,
                "tokenHash" varchar(64) NOT NULL,
                "purpose" varchar(16) NOT NULL,
                "expiresAt" timestamptz NOT NULL,
                "consumedAt" timestamptz,
                "issuedByAdminId" uuid,
                "createdAt" timestamptz NOT NULL DEFAULT now(),
                CONSTRAINT "pk_admin_invite_tokens" PRIMARY KEY ("id"),
                CONSTRAINT "fk_admin_invite_tokens_admin_user"
                    FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id")
                    ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "fk_admin_invite_tokens_issuer"
                    FOREIGN KEY ("issuedByAdminId") REFERENCES "admin_users"("id")
                    ON DELETE SET NULL ON UPDATE NO ACTION
            )
        `);

        await queryRunner.query(
            `CREATE UNIQUE INDEX "idx_admin_invite_token_hash" ON "admin_invite_tokens" ("tokenHash")`,
        );
        await queryRunner.query(
            `CREATE INDEX "idx_admin_invite_open_per_admin" ON "admin_invite_tokens" ("adminUserId") WHERE "consumedAt" IS NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_admin_invite_open_per_admin"`);
        await queryRunner.query(`DROP INDEX "public"."idx_admin_invite_token_hash"`);
        await queryRunner.query(`DROP TABLE "admin_invite_tokens"`);
    }
}
