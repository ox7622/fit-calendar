import { Customer } from '@fitcalendar/db';
import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager } from 'typeorm';

import { CustomerImportService } from '../customer-import.service';

const buildCustomer = (overrides: Partial<Customer> = {}): Customer =>
    ({
        id: 'cust-existing',
        firstName: 'Old',
        lastName: null,
        phone: '+79991234567',
        email: null,
        telegramId: 555,
        telegramUsername: 'tg_existing',
        notes: null,
        isActive: true,
        ...overrides,
    } as Customer);

describe('CustomerImportService', () => {
    let service: CustomerImportService;
    let customerRepo: { find: jest.Mock };
    let managerRepo: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
    let manager: EntityManager;

    beforeEach(async () => {
        customerRepo = { find: jest.fn().mockResolvedValue([]) };
        managerRepo = {
            create: jest.fn((dto) => dto as Customer),
            save: jest.fn(async (entity) => entity as Customer),
            update: jest.fn(async () => ({ affected: 1 })),
        };
        manager = { getRepository: () => managerRepo } as unknown as EntityManager;

        const module: TestingModule = await Test.createTestingModule({
            providers: [CustomerImportService, { provide: getRepositoryToken(Customer), useValue: customerRepo }],
        }).compile();

        service = module.get(CustomerImportService);
    });

    const csv = (rows: string): Buffer => Buffer.from(rows, 'utf-8');

    describe('parseAndValidate', () => {
        it('classifies three new rows as creates', async () => {
            const plan = await service.parseAndValidate(
                csv(['firstName,phone', 'Анна,+79991111111', 'Борис,+79992222222', 'Вера,+79993333333'].join('\n')),
            );

            expect(plan.rowsTotal).toBe(3);
            expect(plan.rowsToCreate).toBe(3);
            expect(plan.rowsToUpdate).toBe(0);
            expect(plan.errors).toHaveLength(0);
            expect(plan.plannedRows.every((r) => r.action === 'create')).toBe(true);
        });

        it('classifies matching phone as update (preserving existing customer id)', async () => {
            customerRepo.find.mockResolvedValueOnce([buildCustomer({ id: 'c1', phone: '+79991111111' })]);

            const plan = await service.parseAndValidate(
                csv(['firstName,phone', 'Новая Анна,+79991111111', 'Борис,+79992222222'].join('\n')),
            );

            expect(plan.rowsToCreate).toBe(1);
            expect(plan.rowsToUpdate).toBe(1);
            const update = plan.plannedRows.find((r) => r.action === 'update');
            expect(update?.customerId).toBe('c1');
            expect(update?.normalized.firstName).toBe('Новая Анна');
        });

        it('errors on missing required header (no phone column)', async () => {
            const plan = await service.parseAndValidate(csv(['firstName', 'Анна'].join('\n')));

            expect(plan.errors).toContainEqual({
                row: 1,
                column: 'phone',
                message: 'Колонка "phone" обязательна',
            });
            expect(plan.plannedRows).toHaveLength(0);
        });

        it('errors on missing firstName per row, points to the right row number', async () => {
            const plan = await service.parseAndValidate(
                csv(['firstName,phone', 'Анна,+79991111111', ',+79992222222'].join('\n')),
            );

            expect(plan.errors).toContainEqual({
                row: 3,
                column: 'firstName',
                message: 'firstName не указан',
            });
            expect(plan.rowsToCreate).toBe(1);
        });

        it('errors on invalid phone and excludes the row from plannedRows', async () => {
            const plan = await service.parseAndValidate(csv(['firstName,phone', 'Анна,abc'].join('\n')));

            expect(plan.errors).toContainEqual({
                row: 2,
                column: 'phone',
                message: 'Неверный формат телефона: "abc"',
            });
            expect(plan.plannedRows).toHaveLength(0);
        });

        it('reports in-batch duplicate phones, processes the first occurrence only', async () => {
            const plan = await service.parseAndValidate(
                csv(['firstName,phone', 'Анна,+79991111111', 'Борис,+79992222222', 'Дубликат,+79991111111'].join('\n')),
            );

            expect(plan.rowsToCreate).toBe(2);
            expect(plan.errors).toContainEqual({
                row: 4,
                column: 'phone',
                message: 'Дубликат телефона +79991111111 (впервые в строке 2)',
            });
        });

        it('rejects > 5000 rows with BadRequest before doing any work', async () => {
            const rows = ['firstName,phone'];
            for (let i = 0; i < 5001; i++) {
                rows.push(`Имя${i},+7999${String(i).padStart(7, '0')}`);
            }
            await expect(service.parseAndValidate(csv(rows.join('\n')))).rejects.toThrow(BadRequestException);
        });
    });

    describe('commit', () => {
        it('creates new customers and only patches CSV-provided columns on updates', async () => {
            const plan = await service.parseAndValidate(csv(['firstName,phone', 'Анна,+79991111111'].join('\n')));

            const result = await service.commit(plan.plannedRows, manager);

            expect(result.created).toBe(1);
            expect(managerRepo.save).toHaveBeenCalledTimes(1);
            expect(managerRepo.update).not.toHaveBeenCalled();
        });

        it('update path does NOT touch telegramId or telegramUsername (preserved on existing customer)', async () => {
            customerRepo.find.mockResolvedValueOnce([buildCustomer({ id: 'c1', phone: '+79991111111' })]);
            const plan = await service.parseAndValidate(
                // CSV intentionally omits telegramUsername to verify the update patch leaves it alone.
                csv(['firstName,phone,notes', 'Новая Анна,+79991111111,vip'].join('\n')),
            );

            await service.commit(plan.plannedRows, manager);

            expect(managerRepo.update).toHaveBeenCalledTimes(1);
            const patch = managerRepo.update.mock.calls[0][1];
            expect(patch.firstName).toBe('Новая Анна');
            expect(patch.notes).toBe('vip');
            expect(patch).not.toHaveProperty('telegramId');
            expect(patch).not.toHaveProperty('telegramUsername');
        });
    });
});
