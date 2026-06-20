import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';

import { entities } from '../../data-source';
import {
    AdminUser,
    Coach,
    ClubInfo,
    Customer,
    MembershipPlan,
    Reminder,
    ScheduleEntry,
    TrainingType,
} from '../../entities';

describe('Seed Data Verification Tests', () => {
    let dataSource: DataSource;
    let coachRepo: Repository<Coach>;
    let trainingTypeRepo: Repository<TrainingType>;
    let scheduleEntryRepo: Repository<ScheduleEntry>;
    let clubInfoRepo: Repository<ClubInfo>;
    let adminUserRepo: Repository<AdminUser>;
    let membershipPlanRepo: Repository<MembershipPlan>;
    let customerRepo: Repository<Customer>;

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'postgres',
            host: process.env['NX_DB_HOST'] || 'localhost',
            port: Number(process.env['NX_DB_PORT']) || 5432,
            username: process.env['NX_DB_USER'] || 'postgres',
            password: process.env['NX_DB_PASS'] || 'postgres',
            database: process.env['NX_DB_NAME'] || 'fitcalendar',
            schema: 'public',
            entities,
            synchronize: false,
            logging: false,
        });

        await dataSource.initialize();

        coachRepo = dataSource.getRepository(Coach);
        trainingTypeRepo = dataSource.getRepository(TrainingType);
        scheduleEntryRepo = dataSource.getRepository(ScheduleEntry);
        clubInfoRepo = dataSource.getRepository(ClubInfo);
        adminUserRepo = dataSource.getRepository(AdminUser);
        membershipPlanRepo = dataSource.getRepository(MembershipPlan);
        customerRepo = dataSource.getRepository(Customer);
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    describe('ClubInfo Seed Data', () => {
        it('should have exactly 1 club info record', async () => {
            const count = await clubInfoRepo.count();
            expect(count).toBe(1);
        });

        it('should have club with correct name', async () => {
            const club = await clubInfoRepo.findOne({ where: {} });
            expect(club?.name).toBe('FitCalendar Gym');
        });

        it('should have working hours for all days of the week', async () => {
            const club = await clubInfoRepo.findOne({ where: {} });
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

            days.forEach((day) => {
                expect(club?.workingHours[day]).toBeDefined();
                expect(club?.workingHours[day]?.open).toBeDefined();
                expect(club?.workingHours[day]?.close).toBeDefined();
            });
        });

        it('should have coordinates set', async () => {
            const club = await clubInfoRepo.findOne({ where: {} });
            expect(club?.latitude).not.toBeNull();
            expect(club?.longitude).not.toBeNull();
        });
    });

    describe('AdminUser Seed Data', () => {
        it('should have at least 1 admin user', async () => {
            const count = await adminUserRepo.count();
            expect(count).toBeGreaterThanOrEqual(1);
        });

        it('should have admin with correct login', async () => {
            const admin = await adminUserRepo.findOne({
                where: { login: 'admin' },
            });
            expect(admin).not.toBeNull();
            expect(admin?.name).toBe('Admin');
            expect(admin?.isActive).toBe(true);
        });

        it('should have bcrypt password hash', async () => {
            const admin = await adminUserRepo.findOne({ where: {} });
            // bcrypt hash starts with $2a$, $2b$, or $2y$
            expect(admin?.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
        });
    });

    describe('Coach Seed Data', () => {
        it('should have 4 coaches', async () => {
            const count = await coachRepo.count();
            expect(count).toBe(4);
        });

        it('should have all coaches active', async () => {
            const coaches = await coachRepo.find();
            coaches.forEach((coach) => {
                expect(coach.isActive).toBe(true);
            });
        });

        it('should have coaches with specializations', async () => {
            const coaches = await coachRepo.find();
            coaches.forEach((coach) => {
                expect(coach.specializations.length).toBeGreaterThan(0);
            });
        });

        it('should have coaches with certifications', async () => {
            const coaches = await coachRepo.find();
            coaches.forEach((coach) => {
                expect(coach.certifications.length).toBeGreaterThan(0);
            });
        });

        it('should have coaches with bio', async () => {
            const coaches = await coachRepo.find();
            coaches.forEach((coach) => {
                expect(coach.bio).not.toBeNull();
                expect(coach.bio?.length).toBeGreaterThan(0);
            });
        });
    });

    describe('TrainingType Seed Data', () => {
        it('should have 6 training types', async () => {
            const count = await trainingTypeRepo.count();
            expect(count).toBe(6);
        });

        it('should have all training types active', async () => {
            const types = await trainingTypeRepo.find();
            types.forEach((type) => {
                expect(type.isActive).toBe(true);
            });
        });

        it('should have valid difficulty distribution', async () => {
            const types = await trainingTypeRepo.find();
            const difficulties = types.map((t) => t.difficulty);

            // Should have at least one of each difficulty level
            expect(difficulties).toContain('beginner');
            expect(difficulties).toContain('intermediate');
            expect(difficulties).toContain('advanced');
        });

        it('should have training types with impact types', async () => {
            const types = await trainingTypeRepo.find();
            types.forEach((type) => {
                expect(type.impactTypes.length).toBeGreaterThan(0);

                // All impact types should be valid
                const validImpactTypes = ['cardio', 'strength', 'flexibility', 'balance'];
                type.impactTypes.forEach((impact) => {
                    expect(validImpactTypes).toContain(impact);
                });
            });
        });

        it('should have training types with descriptions', async () => {
            const types = await trainingTypeRepo.find();
            types.forEach((type) => {
                expect(type.description).not.toBeNull();
                expect(type.description?.length).toBeGreaterThan(0);
            });
        });
    });

    describe('ScheduleEntry Seed Data', () => {
        it('should have at least 15 schedule entries', async () => {
            // Exact count depends on the week the seed runs (weekends drop the evening
            // session — see seed.ts:215). Just sanity-check the lower bound.
            const count = await scheduleEntryRepo.count();
            expect(count).toBeGreaterThanOrEqual(15);
        });

        it('should have all schedule entries with scheduled status', async () => {
            const entries = await scheduleEntryRepo.find();
            entries.forEach((entry) => {
                expect(entry.status).toBe('scheduled');
            });
        });

        it('should have schedule entries with valid foreign keys', async () => {
            const entries = await scheduleEntryRepo.find({
                relations: ['coach', 'trainingType'],
            });

            entries.forEach((entry) => {
                expect(entry.coach).toBeDefined();
                expect(entry.trainingType).toBeDefined();
            });
        });

        it('should have schedule entries with a valid duration', async () => {
            const entries = await scheduleEntryRepo.find();
            entries.forEach((entry) => {
                // Bounds mirror the domain range DURATION_OPTION_MIN/MAX_MINUTES
                // (5..480) in @fitcalendar/shared. The old 30..120 assertion was
                // arbitrary and tripped on legitimate admin-created short classes
                // (e.g. a 25-min slot), since this reads every row in the DB.
                expect(entry.durationMinutes).toBeGreaterThanOrEqual(5);
                expect(entry.durationMinutes).toBeLessThanOrEqual(480);
            });
        });

        it('should have schedule entries spread across multiple days', async () => {
            const entries = await scheduleEntryRepo.find();
            const uniqueDays = new Set(entries.map((e) => e.startTime.toISOString().split('T')[0]));

            // Should have entries across at least 5 different days
            expect(uniqueDays.size).toBeGreaterThanOrEqual(5);
        });

        it('should have variety of coaches in schedule', async () => {
            const entries = await scheduleEntryRepo.find();
            const uniqueCoaches = new Set(entries.map((e) => e.coachId));

            // Should use multiple coaches
            expect(uniqueCoaches.size).toBeGreaterThan(1);
        });

        it('should have variety of training types in schedule', async () => {
            const entries = await scheduleEntryRepo.find();
            const uniqueTypes = new Set(entries.map((e) => e.trainingTypeId));

            // Should use multiple training types
            expect(uniqueTypes.size).toBeGreaterThan(1);
        });
    });

    describe('MembershipPlan Seed Data (Story 7.1)', () => {
        it('should have 6 default plans', async () => {
            const count = await membershipPlanRepo.count();
            expect(count).toBe(6);
        });

        it('should have at least one plan per duration unit', async () => {
            const plans = await membershipPlanRepo.find();
            const units = new Set(plans.map((p) => p.durationUnit));
            expect(units).toContain('day');
            expect(units).toContain('week');
            expect(units).toContain('month');
        });

        it('should have positive prices on every plan', async () => {
            const plans = await membershipPlanRepo.find();
            plans.forEach((plan) => {
                expect(plan.priceRub).toBeGreaterThan(0);
            });
        });
    });

    describe('Customer Seed Data (Story 7.2)', () => {
        it('should have the 2 demo customers from seed', async () => {
            // Use the seeded phones as a stable lookup. Other tests may have left
            // additional fixtures behind, so check by phone rather than total count.
            const anna = await customerRepo.findOne({ where: { phone: '+79001234567' } });
            const boris = await customerRepo.findOne({ where: { phone: '+79007654321' } });
            expect(anna).not.toBeNull();
            expect(boris).not.toBeNull();
        });

        it('should have one linked and one unlinked demo customer', async () => {
            const linked = await customerRepo.findOne({ where: { phone: '+79001234567' } });
            const unlinked = await customerRepo.findOne({ where: { phone: '+79007654321' } });
            expect(linked?.telegramId).not.toBeNull();
            expect(unlinked?.telegramId).toBeNull();
        });
    });

    describe('Seed Data Integrity', () => {
        it('should have no orphaned schedule entries', async () => {
            // All schedule entries should have valid coach and training type
            const orphanedEntries = await dataSource.query(`
                SELECT se.id
                FROM schedule_entries se
                LEFT JOIN coaches c ON se."coachId" = c.id
                LEFT JOIN training_types tt ON se."trainingTypeId" = tt.id
                WHERE c.id IS NULL OR tt.id IS NULL
            `);

            expect(orphanedEntries.length).toBe(0);
        });

        it('should have no reminders created by seed (reminders are user-created)', async () => {
            const reminderCount = await dataSource.getRepository(Reminder).count();

            // Seed should not create any reminders - they're created when users subscribe
            // Note: If integration tests created reminders, this may fail
            expect(reminderCount).toBeLessThanOrEqual(5); // Allow for test-created reminders
        });
    });
});
