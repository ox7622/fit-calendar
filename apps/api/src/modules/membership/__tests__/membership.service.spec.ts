import { Customer, CustomerMembership, GuestVisit, MembershipPlan } from '@fitcalendar/db';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';

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
    let guestVisitRepo: { find: jest.Mock };
    let txMembershipRepo: { findOne: jest.Mock; save: jest.Mock };
    let txGuestVisitRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
    let dataSource: { transaction: jest.Mock };

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
        guestVisitRepo = { find: jest.fn() };

        txMembershipRepo = { findOne: jest.fn(), save: jest.fn(async (e) => e) };
        txGuestVisitRepo = {
            findOne: jest.fn(),
            create: jest.fn((dto) => ({ id: 'gv-new', ...dto } as GuestVisit)),
            save: jest.fn(async (entity) => entity as GuestVisit),
            delete: jest.fn(async () => ({ affected: 1 })),
        };
        const manager = {
            getRepository: (target: unknown): unknown => {
                if (target === CustomerMembership) return txMembershipRepo;
                if (target === GuestVisit) return txGuestVisitRepo;
                throw new Error(`Unexpected target ${String(target)}`);
            },
        } as unknown as EntityManager;
        dataSource = {
            transaction: jest.fn(async (cb: (m: EntityManager) => Promise<unknown>) => cb(manager)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MembershipService,
                { provide: getRepositoryToken(CustomerMembership), useValue: membershipRepo },
                { provide: getRepositoryToken(Customer), useValue: customerRepo },
                { provide: getRepositoryToken(MembershipPlan), useValue: planRepo },
                { provide: getRepositoryToken(GuestVisit), useValue: guestVisitRepo },
                { provide: getDataSourceToken(), useValue: dataSource as unknown as DataSource },
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

    describe('recordGuestVisit (Story 7.5)', () => {
        it('decrements remaining and inserts the visit row in one transaction', async () => {
            const membership = buildMembership({ status: 'active', guestVisitsRemaining: 2 });
            txMembershipRepo.findOne.mockResolvedValueOnce(membership);

            const result = await service.recordGuestVisit('m1', { notes: 'guest' }, 'admin-1');

            expect(txMembershipRepo.findOne).toHaveBeenCalledWith({
                where: { id: 'm1' },
                lock: { mode: 'pessimistic_write' },
            });
            expect(membership.guestVisitsRemaining).toBe(1);
            expect(result.remaining).toBe(1);
            expect(txGuestVisitRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerMembershipId: 'm1',
                    notes: 'guest',
                    recordedByAdminId: 'admin-1',
                }),
            );
        });

        it('uses an explicit visitedAt when provided', async () => {
            txMembershipRepo.findOne.mockResolvedValueOnce(buildMembership({ guestVisitsRemaining: 2 }));
            const explicitDate = new Date('2026-04-10T12:34:00Z');

            await service.recordGuestVisit('m1', { visitedAt: explicitDate }, 'admin-1');

            expect(txGuestVisitRepo.create).toHaveBeenCalledWith(expect.objectContaining({ visitedAt: explicitDate }));
        });

        it('throws 400 NO_GUEST_VISITS_REMAINING when counter is 0', async () => {
            txMembershipRepo.findOne.mockResolvedValueOnce(buildMembership({ guestVisitsRemaining: 0 }));

            await expect(service.recordGuestVisit('m1', {}, 'admin-1')).rejects.toThrow(BadRequestException);
            expect(txMembershipRepo.save).not.toHaveBeenCalled();
            expect(txGuestVisitRepo.save).not.toHaveBeenCalled();
        });

        it('throws 400 MEMBERSHIP_NOT_ACTIVE on cancelled membership', async () => {
            txMembershipRepo.findOne.mockResolvedValueOnce(buildMembership({ status: 'cancelled' }));

            await expect(service.recordGuestVisit('m1', {}, 'admin-1')).rejects.toThrow(BadRequestException);
        });

        it('throws 400 MEMBERSHIP_NOT_ACTIVE on expired membership', async () => {
            txMembershipRepo.findOne.mockResolvedValueOnce(buildMembership({ status: 'expired' }));

            await expect(service.recordGuestVisit('m1', {}, 'admin-1')).rejects.toThrow(BadRequestException);
        });

        it('throws 404 when the membership does not exist', async () => {
            txMembershipRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.recordGuestVisit('missing', {}, 'admin-1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('undoGuestVisit (Story 7.5)', () => {
        it('increments remaining and deletes the visit row', async () => {
            const visit = {
                id: 'gv1',
                customerMembershipId: 'm1',
                visitedAt: new Date(),
                notes: null,
                recordedByAdminId: 'admin-1',
                createdAt: new Date(),
            } as GuestVisit;
            txGuestVisitRepo.findOne.mockResolvedValueOnce(visit);
            const membership = buildMembership({ guestVisitsRemaining: 1 });
            txMembershipRepo.findOne.mockResolvedValueOnce(membership);

            const result = await service.undoGuestVisit('gv1');

            expect(membership.guestVisitsRemaining).toBe(2);
            expect(result.remaining).toBe(2);
            expect(txGuestVisitRepo.delete).toHaveBeenCalledWith({ id: 'gv1' });
        });

        it('throws 404 when the visit does not exist', async () => {
            txGuestVisitRepo.findOne.mockResolvedValueOnce(null);

            await expect(service.undoGuestVisit('missing')).rejects.toThrow(NotFoundException);
            expect(txMembershipRepo.findOne).not.toHaveBeenCalled();
        });
    });

    describe('findGuestVisitsByMembership (Story 7.5)', () => {
        it('queries with DESC visitedAt order', async () => {
            guestVisitRepo.find.mockResolvedValueOnce([]);

            await service.findGuestVisitsByMembership('m1');

            expect(guestVisitRepo.find).toHaveBeenCalledWith({
                where: { customerMembershipId: 'm1' },
                order: { visitedAt: 'DESC' },
            });
        });
    });
});
