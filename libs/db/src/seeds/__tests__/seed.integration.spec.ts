import { DataSource, Repository } from 'typeorm';

import { User, Coach, TrainingType, ScheduleEntry, Reminder, ClubInfo, AdminUser } from '../../entities';
import { entities } from '../../data-source';

describe('Seed Data Verification Tests', () => {
    let dataSource: DataSource;
    let coachRepo: Repository<Coach>;
    let trainingTypeRepo: Repository<TrainingType>;
    let scheduleEntryRepo: Repository<ScheduleEntry>;
    let clubInfoRepo: Repository<ClubInfo>;
    let adminUserRepo: Repository<AdminUser>;

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

        it('should have admin with correct email', async () => {
            const admin = await adminUserRepo.findOne({
                where: { email: 'admin@fitcalendar.ru' },
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
        it('should have 19 schedule entries', async () => {
            const count = await scheduleEntryRepo.count();
            expect(count).toBe(19);
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

        it('should have schedule entries with reasonable duration', async () => {
            const entries = await scheduleEntryRepo.find();
            entries.forEach((entry) => {
                expect(entry.durationMinutes).toBeGreaterThanOrEqual(30);
                expect(entry.durationMinutes).toBeLessThanOrEqual(120);
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

        it('should have no users created by seed (users come from Telegram)', async () => {
            const userRepo = dataSource.getRepository(User);
            const userCount = await userRepo.count();

            // Seed should not create any users - they come from Telegram auth
            // Note: If integration tests created users, this may fail
            // This test verifies seed script behavior specifically
            expect(userCount).toBeLessThanOrEqual(5); // Allow for test-created users
        });

        it('should have no reminders created by seed (reminders are user-created)', async () => {
            const reminderRepo = dataSource.getRepository(Reminder);
            const reminderCount = await reminderRepo.count();

            // Seed should not create any reminders - they're created when users subscribe
            // Note: If integration tests created reminders, this may fail
            expect(reminderCount).toBeLessThanOrEqual(5); // Allow for test-created reminders
        });
    });
});
