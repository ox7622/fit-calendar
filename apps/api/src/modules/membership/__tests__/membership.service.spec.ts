import { Customer, CustomerMembership, MembershipPlan } from '@fitcalendar/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MembershipService, addByUnit } from '../membership.service';

const buildPlan = (overrides: Partial<MembershipPlan> = {}): MembershipPlan =>
    ({
        id: 'plan-12m',
        name: '12 месяцев',
        durationValue: 12,
        durationUnit: 'month',
        priceRub: 50000,
        features: ['12 месяцев'],
        guestVisitsAllowed: 2,
        freezeDaysAllowed: 30,
        isActive: true,
        ...overrides,
    } as MembershipPlan);

const buildMembership = (overrides: Partial<CustomerMembership> = {}): CustomerMembership =>
    ({
        id: 'm1',
        customerId: 'c1',
        planId: 'plan-12m',
        startDate: new Date('2026-01-15T00:00:00Z'),
        endDate: new Date('2027-01-15T00:00:00Z'),
        guestVisitsRemaining: 2,
        freezeDaysRemaining: 30,
        status: 'active',
        notes: null,
        createdByAdminId: null,
        plan: buildPlan(),
        ...overrides,
    } as CustomerMembership);

describe('MembershipService', () => {
    let service: MembershipService;
    let membershipRepo: { findOne: jest.Mock; find: jest.Mock; create: jest.Mock; save: jest.Mock; update: jest.Mock };
    let customerRepo: { findOne: jest.Mock };
    let planRepo: { findOne: jest.Mock };

    beforeEach(async () => {
        membershipRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((dto) => dto as CustomerMembership),
            save: jest.fn(async (entity) => ({ ...entity, id: entity.id ?? 'm-new' } as CustomerMembership)),
            update: jest.fn(),
        };
        customerRepo = { findOne: jest.fn() };
        planRepo = { findOne: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MembershipService,
                { provide: getRepositoryToken(CustomerMembership), useValue: membershipRepo },
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(MembershipPlan), useValue: planRepo },
            ],
        }).compile();

        service = module.get(MembershipService);
    });

    describe('addByUnit helper', () => {
        it('adds days, weeks, months correctly', () => {
            const base = new Date('2026-01-15T00:00:00Z');
            expect(addByUnit(base, 7, 'day').toISOString()).toBe('2026-01-22T00:00:00.000Z');
            expect(addByUnit(base, 2, 'week').toISOString()).toBe('2026-01-29T00:00:00.000Z');
            expect(addByUnit(base, 3, 'month').toISOString()).toBe('2026-04-15T00:00:00.000Z');
        });
    });

    describe('assign', () => {
        it('creates with computed endDate + snapshot counters for a 12-month plan', async () => {
            customerRepo.findOne.mockResolvedValueOnce({ id: 'c1', isActive: true } as Customer);
            planRepo.findOne.mockResolvedValueOnce(buildPlan());
            membershipRepo.findOne
                .mockResolvedValueOnce(null) // no active
                .mockResolvedValueOnce(buildMembership({ id: 'm-new' })); // reload after save

            const result = await service.assign(
                'c1',
                { planId: 'plan-12m', startDate: new Date('2026-01-15Z') },
                'admin-1',
            );

            expect(result.status).toBe('created');
            const created = membershipRepo.create.mock.calls[0][0];
            expect(created).toMatchObject({
                customerId: 'c1',
                planId: 'plan-12m',
                guestVisitsRemaining: 2,
                freezeDaysRemaining: 30,
                status: 'active',
                createdByAdminId: 'admin-1',
            });
            // 12 months from 2026-01-15 → 2027-01-15
            expect((created.endDate as Date).toISOString().slice(0, 10)).toBe('2027-01-15');
        });

        it('returns active_exists without inserting when a current active membership exists', async () => {
            customerRepo.findOne.mockResolvedValueOnce({ id: 'c1', isActive: true } as Customer);
            planRepo.findOne.mockResolvedValueOnce(buildPlan());
            const existing = buildMembership({ id: 'm-old' });
            membershipRepo.findOne.mockResolvedValueOnce(existing);

            const result = await service.assign('c1', { planId: 'plan-12m', startDate: new Date('2026-02-01Z') }, null);

            expect(result.status).toBe('active_exists');
            if (result.status === 'active_exists') {
                expect(result.existingActive.id).toBe('m-old');
            }
            expect(membershipRepo.save).not.toHaveBeenCalled();
        });

        it('rejects assignment to an inactive customer (400)', async () => {
            customerRepo.findOne.mockResolvedValueOnce({ id: 'c1', isActive: false } as Customer);

            await expect(
                service.assign('c1', { planId: 'plan-12m', startDate: new Date('2026-01-15Z') }, null),
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects assignment to an inactive plan (400)', async () => {
            customerRepo.findOne.mockResolvedValueOnce({ id: 'c1', isActive: true } as Customer);
            planRepo.findOne.mockResolvedValueOnce({ ...buildPlan(), isActive: false } as MembershipPlan);

            await expect(
                service.assign('c1', { planId: 'plan-12m', startDate: new Date('2026-01-15Z') }, null),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('cancel', () => {
        it('flips status to cancelled', async () => {
            const existing = buildMembership({ status: 'active' });
            membershipRepo.findOne
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce({ ...existing, status: 'cancelled' } as CustomerMembership);

            const result = await service.cancel('m1');

            expect(result.status).toBe('cancelled');
            expect(membershipRepo.save).toHaveBeenCalled();
        });

        it('is idempotent on already-cancelled', async () => {
            const existing = buildMembership({ status: 'cancelled' });
            membershipRepo.findOne.mockResolvedValueOnce(existing);

            const result = await service.cancel('m1');

            expect(result.status).toBe('cancelled');
            expect(membershipRepo.save).not.toHaveBeenCalled();
        });

        it('throws 404 when not found', async () => {
            membershipRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.cancel('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateMembership', () => {
        it('only modifies endDate and notes', async () => {
            const existing = buildMembership();
            membershipRepo.findOne
                .mockResolvedValueOnce(existing)
                .mockResolvedValueOnce({ ...existing, endDate: new Date('2027-02-15T00:00:00Z') });

            await service.updateMembership('m1', { endDate: new Date('2027-02-15Z'), notes: 'extended' });

            expect(existing.endDate.toISOString().slice(0, 10)).toBe('2027-02-15');
            expect(existing.notes).toBe('extended');
        });

        it('throws 404 when membership missing', async () => {
            membershipRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.updateMembership('missing', { notes: 'x' })).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCurrentForCustomer', () => {
        it('returns the active membership when found', async () => {
            membershipRepo.findOne.mockResolvedValueOnce(buildMembership());

            const result = await service.getCurrentForCustomer('c1');

            expect(result?.status).toBe('active');
            expect(membershipRepo.findOne).toHaveBeenCalledWith({
                where: { customerId: 'c1', status: 'active' },
                relations: ['plan'],
                order: { endDate: 'DESC' },
            });
        });

        it('returns null when no active membership exists', async () => {
            membershipRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.getCurrentForCustomer('c1');
            expect(result).toBeNull();
        });
    });
});
