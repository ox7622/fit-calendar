import { CustomerMembership, MembershipPlan } from '@fitcalendar/db';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AdminAuditService } from '../../admin/audit';
import { MembershipPlansService } from '../membership-plans.service';

const mockAuditService = { record: jest.fn().mockResolvedValue(undefined) };

const buildPlan = (overrides: Partial<MembershipPlan> = {}): MembershipPlan => ({
    id: 'plan-uuid-1',
    name: '12-месячный',
    durationValue: 12,
    durationUnit: 'month',
    priceRub: 30000,
    features: ['2 гостевых визита'],
    guestVisitsAllowed: 2,
    freezeDaysAllowed: 30,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
});

describe('MembershipPlansService', () => {
    let service: MembershipPlansService;
    let mockRepository: jest.Mocked<Repository<MembershipPlan>>;
    let membershipRepository: jest.Mocked<Repository<CustomerMembership>>;

    beforeEach(async () => {
        mockAuditService.record.mockClear();
        mockRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn((dto) => dto as MembershipPlan),
            save: jest.fn(),
            remove: jest.fn(),
        } as unknown as jest.Mocked<Repository<MembershipPlan>>;

        membershipRepository = {
            count: jest.fn().mockResolvedValue(0),
        } as unknown as jest.Mocked<Repository<CustomerMembership>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MembershipPlansService,
                { provide: getRepositoryToken(MembershipPlan), useValue: mockRepository },
                { provide: getRepositoryToken(CustomerMembership), useValue: membershipRepository },
                { provide: AdminAuditService, useValue: mockAuditService },
            ],
        }).compile();

        service = module.get<MembershipPlansService>(MembershipPlansService);
    });

    describe('findAllActive', () => {
        it('returns only active plans, sorted by unit (day → week → month) then duration', async () => {
            const plans = [
                buildPlan({ id: '1', durationUnit: 'month', durationValue: 12, name: '12-month' }),
                buildPlan({ id: '2', durationUnit: 'day', durationValue: 1, name: '1-day' }),
                buildPlan({ id: '3', durationUnit: 'week', durationValue: 1, name: '1-week' }),
                buildPlan({ id: '4', durationUnit: 'month', durationValue: 1, name: '1-month' }),
            ];
            mockRepository.find.mockResolvedValue(plans);

            const result = await service.findAllActive();

            expect(mockRepository.find).toHaveBeenCalledWith({ where: { isActive: true } });
            expect(result.map((p) => p.id)).toEqual(['2', '3', '4', '1']);
            // Public DTO must not leak admin-only fields.
            expect(result[0]).not.toHaveProperty('isActive');
            expect(result[0]).not.toHaveProperty('createdAt');
        });
    });

    describe('findAllAdmin', () => {
        it('returns all plans (active + inactive) ordered by name', async () => {
            const plans = [buildPlan({ id: '1' }), buildPlan({ id: '2', isActive: false })];
            mockRepository.find.mockResolvedValue(plans);

            const result = await service.findAllAdmin();

            expect(mockRepository.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
            expect(result).toHaveLength(2);
            expect(result[0].isActive).toBe(true);
            expect(result[1].isActive).toBe(false);
        });
    });

    describe('findOptions', () => {
        it('returns active plans as { id, name, durationLabel } sorted by unit/duration', async () => {
            const plans = [
                buildPlan({ id: '1', durationUnit: 'month', durationValue: 12 }),
                buildPlan({ id: '2', durationUnit: 'day', durationValue: 1 }),
            ];
            mockRepository.find.mockResolvedValue(plans);

            const result = await service.findOptions();

            expect(mockRepository.find).toHaveBeenCalledWith({ where: { isActive: true } });
            expect(result).toEqual([
                { id: '2', name: '12-месячный', durationLabel: '1 день' },
                { id: '1', name: '12-месячный', durationLabel: '12 месяцев' },
            ]);
        });
    });

    describe('create', () => {
        it('persists a new plan with isActive defaulting to true', async () => {
            const dto = {
                name: '6-месячный',
                durationValue: 6,
                durationUnit: 'month' as const,
                priceRub: 18000,
                features: ['1 гостевой визит'],
                guestVisitsAllowed: 1,
                freezeDaysAllowed: 14,
            };
            const saved = buildPlan({ ...dto, id: 'new-uuid', isActive: true });
            mockRepository.save.mockResolvedValue(saved);

            const result = await service.create(dto);

            expect(mockRepository.create).toHaveBeenCalledWith({ ...dto, isActive: true });
            expect(mockRepository.save).toHaveBeenCalled();
            expect(result.id).toBe('new-uuid');
            expect(result.isActive).toBe(true);
        });

        it('respects explicit isActive=false from caller', async () => {
            const dto = {
                name: 'Test',
                durationValue: 1,
                durationUnit: 'day' as const,
                priceRub: 100,
                features: [],
                guestVisitsAllowed: 0,
                freezeDaysAllowed: 0,
                isActive: false,
            };
            mockRepository.save.mockResolvedValue(buildPlan({ ...dto, id: 'new', isActive: false }));

            await service.create(dto);

            expect(mockRepository.create).toHaveBeenCalledWith({ ...dto, isActive: false });
        });
    });

    describe('update', () => {
        it('mutates the loaded entity and saves it', async () => {
            const plan = buildPlan({ id: 'plan-1', priceRub: 30000 });
            mockRepository.findOne.mockResolvedValue(plan);
            mockRepository.save.mockImplementation(async (p) => p as MembershipPlan);

            const result = await service.update('plan-1', { priceRub: 32000 });

            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
            expect(plan.priceRub).toBe(32000);
            expect(result.priceRub).toBe(32000);
        });

        it('throws NotFound when plan id does not exist', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.update('missing', { priceRub: 100 })).rejects.toThrow(NotFoundException);
        });
    });

    describe('deletePlan', () => {
        it('removes the plan when no memberships reference it', async () => {
            const plan = buildPlan({ id: 'plan-1' });
            mockRepository.findOne.mockResolvedValue(plan);

            await service.deletePlan('plan-1');

            expect(mockRepository.remove).toHaveBeenCalledWith(plan);
        });

        it('throws Conflict when memberships reference the plan (via the real countReferences query)', async () => {
            const plan = buildPlan({ id: 'plan-1' });
            mockRepository.findOne.mockResolvedValue(plan);
            // Pre-fix bug: countReferences was a stub always returning 0, so this
            // test only passed because of the jest.spyOn override below. The real
            // query now hits membershipRepository.count(), so we drive the fake
            // count there.
            membershipRepository.count.mockResolvedValueOnce(3);

            await expect(service.deletePlan('plan-1')).rejects.toThrow(ConflictException);
            expect(mockRepository.remove).not.toHaveBeenCalled();
            expect(membershipRepository.count).toHaveBeenCalledWith({ where: { planId: 'plan-1' } });
        });

        it('throws NotFound when the plan does not exist', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.deletePlan('missing')).rejects.toThrow(NotFoundException);
        });

        it('countReferences delegates to the membership repo with the right filter', async () => {
            membershipRepository.count.mockResolvedValueOnce(7);

            const result = await service.countReferences('plan-1');

            expect(membershipRepository.count).toHaveBeenCalledWith({ where: { planId: 'plan-1' } });
            expect(result).toBe(7);
        });
    });
});
