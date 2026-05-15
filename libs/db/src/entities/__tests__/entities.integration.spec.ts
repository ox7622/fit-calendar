import type { Repository } from 'typeorm';
import { DataSource } from 'typeorm';

import { entities } from '../../data-source';
import { AdminUser, Coach, ClubInfo, Customer, Reminder, ScheduleEntry, TrainingType } from '../index';

describe('Entity Integration Tests', () => {
    let dataSource: DataSource;
    let customerRepo: Repository<Customer>;
    let coachRepo: Repository<Coach>;
    let trainingTypeRepo: Repository<TrainingType>;
    let scheduleEntryRepo: Repository<ScheduleEntry>;
    let reminderRepo: Repository<Reminder>;
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
            synchronize: false, // Use existing schema from migrations
            logging: false,
        });

        await dataSource.initialize();

        customerRepo = dataSource.getRepository(Customer);
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

    describe('Customer Entity', () => {
        const testPhone = '+79999999991';
        const testTelegramId = 999999991;
        let createdCustomerId: string;

        afterAll(async () => {
            if (createdCustomerId) {
                await customerRepo.delete({ id: createdCustomerId });
            }
        });

        it('should create a customer with all fields', async () => {
            const customer = customerRepo.create({
                firstName: 'Test',
                lastName: 'Customer',
                phone: testPhone,
                email: 'test@example.com',
                telegramId: testTelegramId,
                telegramUsername: 'testcustomer',
                isActive: true,
                notes: 'Integration test fixture',
                reminderMinutes: 45,
            });

            const saved = await customerRepo.save(customer);
            createdCustomerId = saved.id;

            expect(saved.id).toBeDefined();
            expect(saved.firstName).toBe('Test');
            expect(saved.lastName).toBe('Customer');
            expect(saved.phone).toBe(testPhone);
            expect(saved.email).toBe('test@example.com');
            // bigint columns deserialize as string from the pg driver
            expect(Number(saved.telegramId)).toBe(testTelegramId);
            expect(saved.telegramUsername).toBe('testcustomer');
            expect(saved.reminderMinutes).toBe(45);
            expect(saved.createdAt).toBeInstanceOf(Date);
            expect(saved.updatedAt).toBeInstanceOf(Date);
        });

        it('should apply default reminderMinutes of 30', async () => {
            const customer = customerRepo.create({
                firstName: 'Default',
                phone: '+79999999992',
            });

            const saved = await customerRepo.save(customer);

            expect(saved.reminderMinutes).toBe(30);

            await customerRepo.delete({ id: saved.id });
        });

        it('should allow telegramId to be null (admin-created, not yet linked)', async () => {
            const customer = customerRepo.create({
                firstName: 'Unlinked',
                phone: '+79999999993',
                telegramId: null,
            });

            const saved = await customerRepo.save(customer);

            expect(saved.telegramId).toBeNull();
            expect(saved.telegramUsername).toBeNull();

            await customerRepo.delete({ id: saved.id });
        });

        it('should enforce unique phone constraint', async () => {
            const duplicate = customerRepo.create({
                firstName: 'Duplicate',
                phone: testPhone, // collides with the first fixture
            });

            await expect(customerRepo.save(duplicate)).rejects.toThrow();
        });

        it('should enforce unique telegramId constraint when set', async () => {
            const duplicate = customerRepo.create({
                firstName: 'TgDuplicate',
                phone: '+79999999994',
                telegramId: testTelegramId, // collides with the first fixture
            });

            await expect(customerRepo.save(duplicate)).rejects.toThrow();
        });

        it('should find customer by phone', async () => {
            const found = await customerRepo.findOne({ where: { phone: testPhone } });
            expect(found).not.toBeNull();
            expect(found?.firstName).toBe('Test');
        });

        it('should find customer by telegramId', async () => {
            const found = await customerRepo.findOne({ where: { telegramId: testTelegramId } });
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
        let testCustomer: Customer;
        let testScheduleEntry: ScheduleEntry;
        let testReminder: Reminder;

        beforeAll(async () => {
            const coach = await coachRepo.findOne({ where: { isActive: true } });
            const trainingType = await trainingTypeRepo.findOne({ where: { isActive: true } });

            if (!coach || !trainingType) {
                throw new Error('Seed data required for cascade delete test');
            }

            testCustomer = await customerRepo.save(
                customerRepo.create({
                    firstName: 'CascadeTest',
                    phone: '+78888888881',
                }),
            );

            testScheduleEntry = await scheduleEntryRepo.save(
                scheduleEntryRepo.create({
                    coachId: coach.id,
                    trainingTypeId: trainingType.id,
                    startTime: new Date(),
                    durationMinutes: 60,
                    status: 'scheduled',
                }),
            );

            testReminder = await reminderRepo.save(
                reminderRepo.create({
                    customerId: testCustomer.id,
                    scheduleEntryId: testScheduleEntry.id,
                    notifyAt: new Date(),
                    status: 'pending',
                }),
            );
        });

        afterAll(async () => {
            if (testScheduleEntry?.id) {
                await scheduleEntryRepo.delete({ id: testScheduleEntry.id });
            }
            if (testCustomer?.id) {
                await customerRepo.delete({ id: testCustomer.id });
            }
        });

        it('should create reminder with customer and schedule entry references', async () => {
            expect(testReminder.id).toBeDefined();
            expect(testReminder.customerId).toBe(testCustomer.id);
            expect(testReminder.scheduleEntryId).toBe(testScheduleEntry.id);
        });

        it('should enforce unique constraint on (customerId, scheduleEntryId)', async () => {
            const duplicateReminder = reminderRepo.create({
                customerId: testCustomer.id,
                scheduleEntryId: testScheduleEntry.id,
                notifyAt: new Date(),
                status: 'pending',
            });

            await expect(reminderRepo.save(duplicateReminder)).rejects.toThrow();
        });

        it('should cascade delete reminder when customer is deleted', async () => {
            const tempCustomer = await customerRepo.save(
                customerRepo.create({
                    firstName: 'TempCustomer',
                    phone: '+77777777771',
                }),
            );

            const tempReminder = await reminderRepo.save(
                reminderRepo.create({
                    customerId: tempCustomer.id,
                    scheduleEntryId: testScheduleEntry.id,
                    notifyAt: new Date(),
                    status: 'pending',
                }),
            );

            await customerRepo.delete({ id: tempCustomer.id });

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
                email: existingAdmin.email,
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
                coachId: '00000000-0000-0000-0000-000000000000',
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
                trainingTypeId: '00000000-0000-0000-0000-000000000000',
                startTime: new Date(),
                durationMinutes: 60,
                status: 'scheduled',
            });

            await expect(scheduleEntryRepo.save(invalidEntry)).rejects.toThrow();
        });
    });
});
