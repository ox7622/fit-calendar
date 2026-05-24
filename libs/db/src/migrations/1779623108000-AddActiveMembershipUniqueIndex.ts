import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardens Story 7.4 AC4 ("at most one active membership per customer") at the
 * DB level. The application code in `assign()` takes a `pessimistic_write`
 * lock on the Customer row to serialize concurrent assigns, but a unique
 * partial index is defense in depth: even if a future code path bypasses
 * the service (a raw INSERT, a forgotten lock, a manual fix-up script), the
 * DB rejects duplicates with code 23505 and the service maps that to the
 * `active_exists` discriminated result.
 *
 * PostgreSQL partial indexes aren't expressible via the entity decorators
 * we use elsewhere; this migration is hand-written for that reason.
 *
 * One caveat: if any customer somehow already has multiple `active` rows
 * (manual DB edit, pre-fix race), this migration fails. The `up()` runs a
 * defensive SELECT first and throws a readable error so the operator can
 * clean up before retrying. We don't auto-cancel duplicates because picking
 * "the right one" is a business call, not a migration call.
 */
export class AddActiveMembershipUniqueIndex1779623108000 implements MigrationInterface {
    name = 'AddActiveMembershipUniqueIndex1779623108000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const duplicates = await queryRunner.query(
            `SELECT "customerId", COUNT(*)::int AS active_count
             FROM "customer_memberships"
             WHERE "status" = 'active'
             GROUP BY "customerId"
             HAVING COUNT(*) > 1`,
        );
        if (Array.isArray(duplicates) && duplicates.length > 0) {
            const detail = duplicates
                .map((row: { customerId: string; active_count: number }) => `${row.customerId} (${row.active_count})`)
                .join(', ');
            throw new Error(
                `Cannot add unique index: ${duplicates.length} customer(s) have multiple active memberships: ${detail}. ` +
                    'Cancel the duplicates manually, then re-run this migration.',
            );
        }

        await queryRunner.query(
            `CREATE UNIQUE INDEX "uq_active_membership_per_customer"
             ON "customer_memberships" ("customerId")
             WHERE "status" = 'active'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."uq_active_membership_per_customer"`);
    }
}
