import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1768648529915 implements MigrationInterface {
    name = 'InitialSchema1768648529915';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE "coaches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "bio" text, "photoUrl" character varying(500), "specializations" text array NOT NULL DEFAULT '{}', "certifications" text array NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_eddaece1a1f1b197fa39e6864a1" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "training_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "difficulty" character varying(20) NOT NULL, "impactTypes" text array NOT NULL DEFAULT '{}', "equipment" text array NOT NULL DEFAULT '{}', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a79a847b5d16cfbb514bb9305b0" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "schedule_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "trainingTypeId" uuid NOT NULL, "coachId" uuid NOT NULL, "startTime" TIMESTAMP WITH TIME ZONE NOT NULL, "durationMinutes" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'scheduled', "cancellationReason" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bfe848ea36c4b3d8a4b18ec82aa" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "idx_schedule_type" ON "schedule_entries" ("trainingTypeId") `);
        await queryRunner.query(`CREATE INDEX "idx_schedule_coach" ON "schedule_entries" ("coachId") `);
        await queryRunner.query(`CREATE INDEX "idx_schedule_status" ON "schedule_entries" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_schedule_start_time" ON "schedule_entries" ("startTime") `);
        await queryRunner.query(
            `CREATE TABLE "reminders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "scheduleEntryId" uuid NOT NULL, "notifyAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "sentAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_76a8a95999621bb430a5982dcac" UNIQUE ("userId", "scheduleEntryId"), CONSTRAINT "PK_38715fec7f634b72c6cf7ea4893" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "idx_reminders_notify_at" ON "reminders" ("notifyAt") `);
        await queryRunner.query(`CREATE INDEX "idx_reminders_user" ON "reminders" ("userId") `);
        await queryRunner.query(
            `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "telegramId" bigint NOT NULL, "firstName" character varying(255) NOT NULL, "lastName" character varying(255), "username" character varying(255), "reminderMinutes" integer NOT NULL DEFAULT '30', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_df18d17f84763558ac84192c754" UNIQUE ("telegramId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(`CREATE INDEX "idx_users_telegram_id" ON "users" ("telegramId") `);
        await queryRunner.query(
            `CREATE TABLE "club_info" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "address" text NOT NULL, "phone" character varying(50), "workingHours" jsonb NOT NULL DEFAULT '{}', "latitude" numeric(10,8), "longitude" numeric(11,8), "logoUrl" character varying(500), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1ef79e302ffeac6fd57030c4031" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "passwordHash" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`,
        );
        await queryRunner.query(
            `ALTER TABLE "schedule_entries" ADD CONSTRAINT "FK_8bc637a29a9b110d9d1c7e9bd99" FOREIGN KEY ("trainingTypeId") REFERENCES "training_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "schedule_entries" ADD CONSTRAINT "FK_796f7a4fd265ad8d63fdff94c71" FOREIGN KEY ("coachId") REFERENCES "coaches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_f8e4bc520d9e692652afaf3308b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "reminders" ADD CONSTRAINT "FK_ad8c6e7789806d04b24d256d046" FOREIGN KEY ("scheduleEntryId") REFERENCES "schedule_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_ad8c6e7789806d04b24d256d046"`);
        await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "FK_f8e4bc520d9e692652afaf3308b"`);
        await queryRunner.query(`ALTER TABLE "schedule_entries" DROP CONSTRAINT "FK_796f7a4fd265ad8d63fdff94c71"`);
        await queryRunner.query(`ALTER TABLE "schedule_entries" DROP CONSTRAINT "FK_8bc637a29a9b110d9d1c7e9bd99"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP TABLE "club_info"`);
        await queryRunner.query(`DROP INDEX "public"."idx_users_telegram_id"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reminders_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_reminders_notify_at"`);
        await queryRunner.query(`DROP TABLE "reminders"`);
        await queryRunner.query(`DROP INDEX "public"."idx_schedule_start_time"`);
        await queryRunner.query(`DROP INDEX "public"."idx_schedule_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_schedule_coach"`);
        await queryRunner.query(`DROP INDEX "public"."idx_schedule_type"`);
        await queryRunner.query(`DROP TABLE "schedule_entries"`);
        await queryRunner.query(`DROP TABLE "training_types"`);
        await queryRunner.query(`DROP TABLE "coaches"`);
    }
}
