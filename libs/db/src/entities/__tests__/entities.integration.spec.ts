import { DataSource, Repository } from 'typeorm';

import { User, Coach, TrainingType, ScheduleEntry, Reminder, ClubInfo, AdminUser } from '../index';
import { entities } from '../../data-source';

describe('Entity Integration Tests', () => {
    let dataSource: DataSource;
    let userRepo: Repository<User>;
    let coachRepo: Repository<Coach>;
    let trainingTypeRepo: Repository<TrainingType>;
    let scheduleEntryRepo: Repository<ScheduleEntry>;
    let reminderRepo: Repository<Reminder>;
    let clubInfoRepo: Repository<ClubInfo>;
    let adminUserRepo: Repository<AdminUser>;

    beforeAll(async () => {
        // Use test database configuration
        dataSource = new DataSource({
            type: 'postgres',
            host: process.env['NX_DB_HOST'] || 'localhost',
            port: Number(process.env['NX_DB_PORT']) || 5432,
            username: process.env['NX_DB_USER'] || 'postgres',
            password: process.env['NX_DB_PASS'] || 'postgres',
            database: process.env['NX_DB_NAME'] || 'fitcalendar',
            schema: 'public',
            entities,
            synchronize: false, // Use existing schema from migrations
            logging: false,
        });

        await dataSource.initialize();

        userRepo = dataSource.getRepository(User);
        coachRepo = dataSource.getRepository(Coach);
        trainingTypeRepo = dataSource.getRepository(TrainingType);
        scheduleEntryRepo = dataSource.getRepository(ScheduleEntry);
        reminderRepo = dataSource.getRepository(Reminder);
        clubInfoRepo = dataSource.getRepository(ClubInfo);
        adminUserRepo = dataSource.getRepository(AdminUser);
    });

    afterAll(async () => {
        if (dataSource?.isInitialized) {
            await dataSource.destroy();
        }
    });

    describe('User Entity', () => {
        const testTelegramId = 999999999;
        let createdUserId: string;

        afterAll(async () => {
            // Cleanup test user
            if (createdUserId) {
                await userRepo.delete({ id: createdUserId });
            }
        });

        it('should create a user with all fields', async () => {
            const user = userRepo.create({
                telegramId: testTelegramId,
                firstName: 'Test',
                lastName: 'User',
                username: 'testuser',
                reminderMinutes: 45,
            });

            const saved = await userRepo.save(user);
            createdUserId = saved.id;

            expect(saved.id).toBeDefined();
            expect(saved.telegramId).toBe(testTelegramId);
            expect(saved.firstName).toBe('Test');
            expect(saved.lastName).toBe('User');
            expect(saved.username).toBe('testuser');
            expect(saved.reminderMinutes).toBe(45);
            expect(saved.createdAt).toBeInstanceOf(Date);
            expect(saved.updatedAt).toBeInstanceOf(Date);
        });

        it('should apply default reminderMinutes of 30', async () => {
            const uniqueTelegramId = 999999998;
            const user = userRepo.create({
                telegramId: uniqueTelegramId,
                firstName: 'Default',
            });

            const saved = await userRepo.save(user);

            expect(saved.reminderMinutes).toBe(30);

            // Cleanup
            await userRepo.delete({ id: saved.id });
        });

        it('should enforce unique telegramId constraint', async () => {
            const duplicateUser = userRepo.create({
                telegramId: testTelegramId, // Same as existing user
                firstName: 'Duplicate',
            });

            await expect(userRepo.save(duplicateUser)).rejects.toThrow();
        });

        it('should find user by telegramId', async () => {
            const found = await userRepo.findOne({
                where: { telegramId: testTelegramId },
            });

            expect(found).not.toBeNull();
            expect(found?.firstName).toBe('Test');
        });
    });

    describe('Coach Entity', () => {
        it('should read existing coaches from seed data', async () => {
            const coaches = await coachRepo.find();
            expect(coaches.length).toBeGreaterThan(0);
        });

        it('should have array fields for specializations and certifications', async () => {
            const coach = await coachRepo.findOne({ where: { isActive: true } });
            expect(coach).not.toBeNull();
            expect(Array.isArray(coach?.specializations)).toBe(true);
            expect(Array.isArray(coach?.certifications)).toBe(true);
        });
    });

    describe('TrainingType Entity', () => {
        it('should read existing training types from seed data', async () => {
            const types = await trainingTypeRepo.find();
            expect(types.length).toBeGreaterThan(0);
        });

        it('should have valid difficulty values', async () => {
            const types = await trainingTypeRepo.find();
            const validDifficulties = ['beginner', 'intermediate', 'advanced'];

            types.forEach((type) => {
                expect(validDifficulties).toContain(type.difficulty);
            });
        });

        it('should have array fields for impactTypes and equipment', async () => {
            const type = await trainingTypeRepo.findOne({ where: { isActive: true } });
            expect(type).not.toBeNull();
            expect(Array.isArray(type?.impactTypes)).toBe(true);
            expect(Array.isArray(type?.equipment)).toBe(true);
        });
    });

    describe('ScheduleEntry Entity', () => {
        it('should read existing schedule entries with relations', async () => {
            const entries = await scheduleEntryRepo.find({
                relations: ['coach', 'trainingType'],
                take: 5,
            });

            expect(entries.length).toBeGreaterThan(0);

            // Check relations are loaded
            entries.forEach((entry) => {
                expect(entry.coach).toBeDefined();
                expect(entry.trainingType).toBeDefined();
                expect(entry.coach.name).toBeDefined();
                expect(entry.trainingType.name).toBeDefined();
            });
        });

        it('should have valid status values', async () => {
            const entries = await scheduleEntryRepo.find();
            const validStatuses = ['scheduled', 'cancelled'];

            entries.forEach((entry) => {
                expect(validStatuses).toContain(entry.status);
            });
        });
    });

    describe('Reminder Entity - CASCADE Delete', () => {
        let testUser: User;
        let testScheduleEntry: ScheduleEntry;
        let testReminder: Reminder;

        beforeAll(async () => {
            // Get existing coach and training type for creating schedule entry
            const coach = await coachRepo.findOne({ where: { isActive: true } });
            const trainingType = await trainingTypeRepo.findOne({ where: { isActive: true } });

            if (!coach || !trainingType) {
                throw new Error('Seed data required for cascade delete test');
            }

            // Create test user
            testUser = await userRepo.save(
                userRepo.create({
                    telegramId: 888888888,
                    firstName: 'CascadeTest',
                }),
            );

            // Create test schedule entry
            testScheduleEntry = await scheduleEntryRepo.save(
                scheduleEntryRepo.create({
                    coachId: coach.id,
                    trainingTypeId: trainingType.id,
                    startTime: new Date(),
                    durationMinutes: 60,
                    status: 'scheduled',
                }),
            );

            // Create reminder linking user and schedule entry
            testReminder = await reminderRepo.save(
                reminderRepo.create({
                    userId: testUser.id,
                    scheduleEntryId: testScheduleEntry.id,
                    notifyAt: new Date(),
                    status: 'pending',
                }),
            );
        });

        afterAll(async () => {
            // Cleanup - delete schedule entry (should cascade to reminder)
            if (testScheduleEntry?.id) {
                await scheduleEntryRepo.delete({ id: testScheduleEntry.id });
            }
            if (testUser?.id) {
                await userRepo.delete({ id: testUser.id });
            }
        });

        it('should create reminder with user and schedule entry references', async () => {
            expect(testReminder.id).toBeDefined();
            expect(testReminder.userId).toBe(testUser.id);
            expect(testReminder.scheduleEntryId).toBe(testScheduleEntry.id);
        });

        it('should enforce unique constraint on (userId, scheduleEntryId)', async () => {
            const duplicateReminder = reminderRepo.create({
                userId: testUser.id,
                scheduleEntryId: testScheduleEntry.id,
                notifyAt: new Date(),
                status: 'pending',
            });

            await expect(reminderRepo.save(duplicateReminder)).rejects.toThrow();
        });

        it('should cascade delete reminder when user is deleted', async () => {
            // Create another user and reminder for this specific test
            const tempUser = await userRepo.save(
                userRepo.create({
                    telegramId: 777777777,
                    firstName: 'TempUser',
                }),
            );

            const tempReminder = await reminderRepo.save(
                reminderRepo.create({
                    userId: tempUser.id,
                    scheduleEntryId: testScheduleEntry.id,
                    notifyAt: new Date(),
                    status: 'pending',
                }),
            );

            // Delete user - should cascade to reminder
            await userRepo.delete({ id: tempUser.id });

            // Verify reminder was deleted
            const deletedReminder = await reminderRepo.findOne({
                where: { id: tempReminder.id },
            });
            expect(deletedReminder).toBeNull();
        });
    });

    describe('ClubInfo Entity', () => {
        it('should have exactly one club info record (singleton)', async () => {
            const clubs = await clubInfoRepo.find();
            expect(clubs.length).toBe(1);
        });

        it('should have JSONB workingHours with day entries', async () => {
            const club = await clubInfoRepo.findOne({ where: {} });
            expect(club).not.toBeNull();
            expect(club?.workingHours).toBeDefined();
            expect(typeof club?.workingHours).toBe('object');

            // Check for day entries
            if (club?.workingHours.monday) {
                expect(club.workingHours.monday.open).toBeDefined();
                expect(club.workingHours.monday.close).toBeDefined();
            }
        });
    });

    describe('AdminUser Entity', () => {
        it('should have at least one admin user from seed', async () => {
            const admins = await adminUserRepo.find();
            expect(admins.length).toBeGreaterThan(0);
        });

        it('should store password as bcrypt hash', async () => {
            const admin = await adminUserRepo.findOne({ where: { isActive: true } });
            expect(admin).not.toBeNull();
            expect(admin?.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
        });

        it('should enforce unique email constraint', async () => {
            const existingAdmin = await adminUserRepo.findOne({ where: {} });
            if (!existingAdmin) return;

            const duplicateAdmin = adminUserRepo.create({
                email: existingAdmin.email, // Same email
                passwordHash: '$2b$10$test',
                name: 'Duplicate',
            });

            await expect(adminUserRepo.save(duplicateAdmin)).rejects.toThrow();
        });
    });

    describe('Foreign Key Constraints', () => {
        it('should not allow schedule entry with non-existent coach', async () => {
            const trainingType = await trainingTypeRepo.findOne({ where: { isActive: true } });
            if (!trainingType) return;

            const invalidEntry = scheduleEntryRepo.create({
                coachId: '00000000-0000-0000-0000-000000000000', // Non-existent
                trainingTypeId: trainingType.id,
                startTime: new Date(),
                durationMinutes: 60,
                status: 'scheduled',
            });

            await expect(scheduleEntryRepo.save(invalidEntry)).rejects.toThrow();
        });

        it('should not allow schedule entry with non-existent training type', async () => {
            const coach = await coachRepo.findOne({ where: { isActive: true } });
            if (!coach) return;

            const invalidEntry = scheduleEntryRepo.create({
                coachId: coach.id,
                trainingTypeId: '00000000-0000-0000-0000-000000000000', // Non-existent
                startTime: new Date(),
                durationMinutes: 60,
                status: 'scheduled',
            });

            await expect(scheduleEntryRepo.save(invalidEntry)).rejects.toThrow();
        });
    });
});
