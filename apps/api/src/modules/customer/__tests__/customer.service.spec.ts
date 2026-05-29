import { Customer, CustomerMembership, Reminder } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FindOperator, type Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/audit';
import { CustomerService, InvalidPhoneFormatError } from '../customer.service';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

const buildCustomer = (overrides: Partial<Customer> = {}): Customer => ({
    id: 'cust-1',
    firstName: 'Иван',
    lastName: 'Петров',
    phone: '+74951234567',
    email: null,
    telegramId: null,
    telegramUsername: null,
    isActive: true,
    notes: null,
    reminderMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
    reminders: [],
    ...overrides,
});

describe('CustomerService', () => {
    let service: CustomerService;
    let customerRepo: jest.Mocked<Repository<Customer>>;
    let reminderRepo: jest.Mocked<Repository<Reminder>>;
    let membershipRepo: jest.Mocked<Repository<CustomerMembership>>;

    beforeEach(async () => {
        mockAuditService.record.mockClear();
        customerRepo = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn((dto) => dto as Customer),
            save: jest.fn(),
            remove: jest.fn(),
        } as unknown as jest.Mocked<Repository<Customer>>;

        reminderRepo = {
            count: jest.fn().mockResolvedValue(0),
        } as unknown as jest.Mocked<Repository<Reminder>>;

        membershipRepo = {
            count: jest.fn().mockResolvedValue(0),
        } as unknown as jest.Mocked<Repository<CustomerMembership>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(Reminder), useValue: reminderRepo },
                { provide: getRepositoryToken(CustomerMembership), useValue: membershipRepo },
                { provide: AdminAuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get(CustomerService);
    });

    describe('linkTelegramToPhone', () => {
        it('links an unlinked customer (happy path)', async () => {
            const customer = buildCustomer({ phone: '+74951234567', telegramId: null });
            customerRepo.findOne.mockResolvedValueOnce(customer);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.linkTelegramToPhone('+7 495 123 45 67', {
                id: 999,
                username: 'ivanp',
            });

            expect(result.status).toBe('linked');
            expect(result.customer?.telegramId).toBe(999);
            expect(result.customer?.telegramUsername).toBe('ivanp');
            expect(customerRepo.save).toHaveBeenCalled();
        });

        it('is idempotent — same Telegram id, same customer → still linked', async () => {
            const customer = buildCustomer({ telegramId: 999, telegramUsername: 'old-handle' });
            customerRepo.findOne.mockResolvedValueOnce(customer);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.linkTelegramToPhone('+74951234567', { id: 999, username: 'new-handle' });

            expect(result.status).toBe('linked');
            expect(result.customer?.telegramUsername).toBe('new-handle');
        });

        it('returns phone_not_found when no customer matches the normalized phone', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);

            const result = await service.linkTelegramToPhone('+79991234567', { id: 1 });

            expect(result.status).toBe('phone_not_found');
            expect(customerRepo.save).not.toHaveBeenCalled();
        });

        it('returns phone_already_linked when the customer is owned by a different Telegram identity', async () => {
            const customer = buildCustomer({ telegramId: 111 });
            customerRepo.findOne.mockResolvedValueOnce(customer);

            const result = await service.linkTelegramToPhone('+74951234567', { id: 999 });

            expect(result.status).toBe('phone_already_linked');
            expect(customerRepo.save).not.toHaveBeenCalled();
        });

        it('returns invalid_phone for non-normalizable input', async () => {
            const result = await service.linkTelegramToPhone('not-a-phone', { id: 1 });

            expect(result.status).toBe('invalid_phone');
            expect(customerRepo.findOne).not.toHaveBeenCalled();
        });
    });

    describe('create', () => {
        it('normalizes the phone before saving', async () => {
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const saved = await service.create({
                firstName: 'Анна',
                phone: '8 (812) 000-00-00',
            });

            expect(saved.phone).toBe('+78120000000');
        });

        it('throws InvalidPhoneFormatError for bad phone input', async () => {
            await expect(service.create({ firstName: 'X', phone: 'abc' })).rejects.toThrow(InvalidPhoneFormatError);
        });
    });

    describe('unlinkTelegram', () => {
        it('clears telegramId and telegramUsername on the customer', async () => {
            const customer = buildCustomer({ telegramId: 999, telegramUsername: 'handle' });
            customerRepo.findOne.mockResolvedValueOnce(customer);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.unlinkTelegram('cust-1');

            expect(result?.telegramId).toBeNull();
            expect(result?.telegramUsername).toBeNull();
        });

        it('returns null when customer does not exist', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            expect(await service.unlinkTelegram('missing')).toBeNull();
        });
    });

    describe('updateReminderMinutes (Story 5.2)', () => {
        it('persists the new value and returns the updated customer', async () => {
            const customer = buildCustomer({ reminderMinutes: 30 });
            customerRepo.findOne.mockResolvedValueOnce(customer);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.updateReminderMinutes('cust-1', 60);

            expect(result?.reminderMinutes).toBe(60);
            expect(customerRepo.save).toHaveBeenCalled();
        });

        it('returns null when customer does not exist', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            expect(await service.updateReminderMinutes('missing', 60)).toBeNull();
        });
    });

    describe('deleteCustomer', () => {
        it('removes the customer when no reminders OR memberships reference it, and records audit', async () => {
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(0);
            membershipRepo.count.mockResolvedValueOnce(0);

            const result = await service.deleteCustomer('cust-1', {
                adminUserId: 'admin-1',
                ipAddress: '10.0.0.1',
            });

            expect(result).toBe('deleted');
            expect(customerRepo.remove).toHaveBeenCalledWith(customer);
            expect(mockAuditService.record).toHaveBeenCalledWith(
                expect.objectContaining({
                    adminUserId: 'admin-1',
                    ipAddress: '10.0.0.1',
                    action: 'delete_customer',
                    resourceType: 'customer',
                    resourceId: 'cust-1',
                }),
            );
        });

        it('does NOT record audit when delete is blocked by dependencies', async () => {
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(1);
            membershipRepo.count.mockResolvedValueOnce(0);

            await service.deleteCustomer('cust-1');

            expect(mockAuditService.record).not.toHaveBeenCalled();
        });

        it('returns has_dependencies when reminders reference the customer', async () => {
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(3);
            membershipRepo.count.mockResolvedValueOnce(0);

            const result = await service.deleteCustomer('cust-1');

            expect(result).toBe('has_dependencies');
            expect(customerRepo.remove).not.toHaveBeenCalled();
        });

        it('returns has_dependencies when ONLY memberships reference the customer (no reminders)', async () => {
            // Pre-fix bug: this customer would have been hard-deleted, cascading
            // away the membership + any guest visits / freezes attached to it.
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(0);
            membershipRepo.count.mockResolvedValueOnce(1);

            const result = await service.deleteCustomer('cust-1');

            expect(result).toBe('has_dependencies');
            expect(customerRepo.remove).not.toHaveBeenCalled();
        });

        it('counts memberships of any status (active / expired / cancelled all block delete)', async () => {
            // The where clause is { customerId } with no status filter — verify
            // we don't accidentally narrow to active-only.
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(0);
            membershipRepo.count.mockResolvedValueOnce(2);

            await service.deleteCustomer('cust-1');

            expect(membershipRepo.count).toHaveBeenCalledWith({ where: { customerId: 'cust-1' } });
        });

        it('returns not_found when the id does not exist', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            expect(await service.deleteCustomer('missing')).toBe('not_found');
        });
    });

    describe('update', () => {
        it('returns null when customer does not exist', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            expect(await service.update('missing', { firstName: 'X' })).toBeNull();
            expect(customerRepo.save).not.toHaveBeenCalled();
        });

        it('normalizes phone when provided', async () => {
            const existing = buildCustomer({ phone: '+74951234567' });
            customerRepo.findOne.mockResolvedValueOnce(existing);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.update('cust-1', { phone: '8 (812) 000-00-00' });

            expect(result?.phone).toBe('+78120000000');
        });

        it('throws InvalidPhoneFormatError when an invalid phone is provided', async () => {
            customerRepo.findOne.mockResolvedValueOnce(buildCustomer());

            await expect(service.update('cust-1', { phone: 'abc' })).rejects.toThrow(InvalidPhoneFormatError);
            expect(customerRepo.save).not.toHaveBeenCalled();
        });

        it('only patches fields that are explicitly provided (undefined fields stay untouched)', async () => {
            const existing = buildCustomer({
                firstName: 'Иван',
                lastName: 'Петров',
                email: 'old@example.com',
                isActive: true,
            });
            customerRepo.findOne.mockResolvedValueOnce(existing);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            // Only firstName changes; lastName, email, isActive must stay.
            const result = await service.update('cust-1', { firstName: 'Новый' });

            expect(result?.firstName).toBe('Новый');
            expect(result?.lastName).toBe('Петров');
            expect(result?.email).toBe('old@example.com');
            expect(result?.isActive).toBe(true);
        });

        it('treats explicit null as a clear for nullable fields (lastName, email, telegramId, notes)', async () => {
            const existing = buildCustomer({
                lastName: 'Петров',
                email: 'old@example.com',
                telegramId: 999,
                telegramUsername: 'tg',
                notes: 'old note',
            });
            customerRepo.findOne.mockResolvedValueOnce(existing);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.update('cust-1', {
                lastName: null,
                email: null,
                telegramId: null,
                telegramUsername: null,
                notes: null,
            });

            expect(result?.lastName).toBeNull();
            expect(result?.email).toBeNull();
            expect(result?.telegramId).toBeNull();
            expect(result?.telegramUsername).toBeNull();
            expect(result?.notes).toBeNull();
        });

        it('flips isActive false → true', async () => {
            const existing = buildCustomer({ isActive: false });
            customerRepo.findOne.mockResolvedValueOnce(existing);
            customerRepo.save.mockImplementation(async (c) => c as Customer);

            const result = await service.update('cust-1', { isActive: true });

            expect(result?.isActive).toBe(true);
        });
    });

    describe('findAll', () => {
        beforeEach(() => {
            customerRepo.findAndCount.mockResolvedValue([[], 0]);
        });

        it('defaults to page=1, pageSize=50 with no search/filter', async () => {
            const result = await service.findAll({});

            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(50);
            const call = customerRepo.findAndCount.mock.calls[0][0];
            expect(call?.take).toBe(50);
            expect(call?.skip).toBe(0);
            // No search, no filters → `where` is the (empty) filter object, NOT an array.
            expect(Array.isArray(call?.where)).toBe(false);
        });

        it('caps pageSize at 200 even when caller asks for more', async () => {
            await service.findAll({ pageSize: 9999 });
            expect(customerRepo.findAndCount.mock.calls[0][0]?.take).toBe(200);
        });

        it('isActive=false filter is applied (not coerced to undefined for falsy boolean)', async () => {
            await service.findAll({ isActive: false });
            const where = customerRepo.findAndCount.mock.calls[0][0]?.where as Record<string, unknown>;
            expect(where.isActive).toBe(false);
        });

        it('linkedOnly filter sets a telegramId IS NOT NULL operator', async () => {
            await service.findAll({ linkedOnly: true });
            const where = customerRepo.findAndCount.mock.calls[0][0]?.where as Record<string, unknown>;
            expect(where.telegramId).toBeInstanceOf(FindOperator);
        });

        it('search composes OR across firstName / lastName / phone / telegramUsername', async () => {
            await service.findAll({ search: 'Анна' });
            const whereArr = customerRepo.findAndCount.mock.calls[0][0]?.where as Record<string, unknown>[];
            expect(Array.isArray(whereArr)).toBe(true);
            expect(whereArr).toHaveLength(4);
            // Each clause is the search term on a different field.
            const fields = whereArr.map((clause) =>
                Object.keys(clause).find((k) => k !== 'isActive' && k !== 'telegramId'),
            );
            expect(new Set(fields)).toEqual(new Set(['firstName', 'lastName', 'phone', 'telegramUsername']));
        });

        it('search clauses each carry the active+linked filters too (so search doesnt bypass them)', async () => {
            await service.findAll({ search: 'Иван', isActive: true, linkedOnly: true });
            const whereArr = customerRepo.findAndCount.mock.calls[0][0]?.where as Record<string, unknown>[];
            expect(whereArr).toHaveLength(4);
            for (const clause of whereArr) {
                expect(clause.isActive).toBe(true);
                expect(clause.telegramId).toBeInstanceOf(FindOperator);
            }
        });

        it('trims whitespace-only search to nothing (no array, just filters)', async () => {
            await service.findAll({ search: '   ', isActive: true });
            const where = customerRepo.findAndCount.mock.calls[0][0]?.where;
            expect(Array.isArray(where)).toBe(false);
            expect((where as Record<string, unknown>).isActive).toBe(true);
        });
    });

    describe('findTelegramIdsByCustomerIds (Story 5.5)', () => {
        it('short-circuits to [] on empty input without hitting the DB', async () => {
            const result = await service.findTelegramIdsByCustomerIds([]);
            expect(result).toEqual([]);
        });
    });

    describe('findById / findByPhone / findByTelegramId — thin pass-throughs', () => {
        it('findById delegates to repo.findOne with the id', async () => {
            customerRepo.findOne.mockResolvedValueOnce(buildCustomer({ id: 'x' }));
            await service.findById('x');
            expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { id: 'x' } });
        });

        it('findByPhone queries with the normalized phone as-given', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            await service.findByPhone('+74951234567');
            expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { phone: '+74951234567' } });
        });

        it('findByTelegramId queries with the numeric telegramId', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            await service.findByTelegramId(999);
            expect(customerRepo.findOne).toHaveBeenCalledWith({ where: { telegramId: 999 } });
        });
    });
});
