import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderRetryCount1778879017132 implements MigrationInterface {
    name = 'AddReminderRetryCount1778879017132';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_reminders_customer"`);
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "UQ_76a8a95999621bb430a5982dcac"`);
        await queryRunner.query(`ALTER TABLE "reminders" ADD "retryCount" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "UQ_d5f1251eabd01ecea87ac4e92ea" UNIQUE ("customerId", "scheduleEntryId")`,
        );
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_63f7cc9ac0e99ba66d3d4643f9a" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_63f7cc9ac0e99ba66d3d4643f9a"`);
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "UQ_d5f1251eabd01ecea87ac4e92ea"`);
        await queryRunner.query(`ALTER TABLE "reminders" DROP COLUMN "retryCount"`);
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "UQ_76a8a95999621bb430a5982dcac" UNIQUE ("customerId", "scheduleEntryId")`,
        );
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_reminders_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }
}
