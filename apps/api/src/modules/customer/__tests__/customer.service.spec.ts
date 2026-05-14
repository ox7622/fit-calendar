import { Customer, Reminder } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { CustomerService, InvalidPhoneFormatError } from '../customer.service';

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

    beforeEach(async () => {
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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(Reminder), useValue: reminderRepo },
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

    describe('deleteCustomer', () => {
        it('removes the customer when no reminders reference it', async () => {
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(0);

            const result = await service.deleteCustomer('cust-1');

            expect(result).toBe('deleted');
            expect(customerRepo.remove).toHaveBeenCalledWith(customer);
        });

        it('returns has_dependencies when reminders reference the customer', async () => {
            const customer = buildCustomer();
            customerRepo.findOne.mockResolvedValueOnce(customer);
            reminderRepo.count.mockResolvedValueOnce(3);

            const result = await service.deleteCustomer('cust-1');

            expect(result).toBe('has_dependencies');
            expect(customerRepo.remove).not.toHaveBeenCalled();
        });

        it('returns not_found when the id does not exist', async () => {
            customerRepo.findOne.mockResolvedValueOnce(null);
            expect(await service.deleteCustomer('missing')).toBe('not_found');
        });
    });
});
