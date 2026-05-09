import { MembershipPlan } from '@fitcalendar/db';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreatePlanDto } from './dto/create-plan.dto';
import { AdminPlanResponseDto, PlanOptionDto, PlanResponseDto } from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { formatDuration } from './format-duration';

@Injectable()
export class MembershipPlansService {
    private readonly logger = new Logger(MembershipPlansService.name);

    constructor(
        @InjectRepository(MembershipPlan)
        private readonly planRepository: Repository<MembershipPlan>,
    ) {}

    async findAllActive(): Promise<PlanResponseDto[]> {
        this.logger.log('Fetching active membership plans');
        const plans = await this.planRepository.find({ where: { isActive: true } });
        return [...plans].sort(comparePlans).map(toPlanResponse);
    }

    async findAllAdmin(): Promise<AdminPlanResponseDto[]> {
        const plans = await this.planRepository.find({ order: { name: 'ASC' } });
        return plans.map(toAdminPlanResponse);
    }

    async findOptions(): Promise<PlanOptionDto[]> {
        const plans = await this.planRepository.find({ where: { isActive: true } });
        return [...plans].sort(comparePlans).map((plan) => ({
            id: plan.id,
            name: plan.name,
            durationLabel: formatDuration(plan.durationValue, plan.durationUnit),
        }));
    }

    async findById(id: string): Promise<AdminPlanResponseDto> {
        const plan = await this.planRepository.findOne({ where: { id } });
        if (!plan) {
            throw new NotFoundException(`Membership plan with id ${id} not found`);
        }
        return toAdminPlanResponse(plan);
    }

    async create(dto: CreatePlanDto): Promise<AdminPlanResponseDto> {
        const plan = this.planRepository.create({
            ...dto,
            isActive: dto.isActive ?? true,
        });
        const saved = await this.planRepository.save(plan);
        this.logger.log(`Created membership plan ${saved.id} (${saved.name})`);
        return toAdminPlanResponse(saved);
    }

    async update(id: string, dto: UpdatePlanDto): Promise<AdminPlanResponseDto> {
        const plan = await this.planRepository.findOne({ where: { id } });
        if (!plan) {
            throw new NotFoundException(`Membership plan with id ${id} not found`);
        }
        Object.assign(plan, dto);
        const saved = await this.planRepository.save(plan);
        this.logger.log(`Updated membership plan ${saved.id}`);
        return toAdminPlanResponse(saved);
    }

    async deletePlan(id: string): Promise<void> {
        const plan = await this.planRepository.findOne({ where: { id } });
        if (!plan) {
            throw new NotFoundException(`Membership plan with id ${id} not found`);
        }

        // Story 7.4 will add CustomerMembership; once that ships, count references here.
        // For now no membership table exists, so the count is structurally zero.
        // The reference check is wired through countReferences() so 7.4 can patch it
        // by injecting a membership repo without changing the controller surface.
        const referenceCount = await this.countReferences(id);
        if (referenceCount > 0) {
            throw new ConflictException('План не может быть удалён: есть активные подписки. Используйте деактивацию.');
        }

        await this.planRepository.remove(plan);
        this.logger.log(`Deleted membership plan ${id}`);
    }

    /**
     * Count of memberships referencing this plan. Story 7.4 will wire the real query
     * once the customer_memberships table exists. For 7.1 there are no references.
     */
    async countReferences(planId: string): Promise<number> {
        void planId;
        return 0;
    }
}

function toPlanResponse(plan: MembershipPlan): PlanResponseDto {
    return {
        id: plan.id,
        name: plan.name,
        durationValue: plan.durationValue,
        durationUnit: plan.durationUnit,
        priceRub: plan.priceRub,
        features: plan.features,
        guestVisitsAllowed: plan.guestVisitsAllowed,
        freezeDaysAllowed: plan.freezeDaysAllowed,
    };
}

function toAdminPlanResponse(plan: MembershipPlan): AdminPlanResponseDto {
    return {
        ...toPlanResponse(plan),
        isActive: plan.isActive,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
    };
}

const UNIT_ORDER: Record<MembershipPlan['durationUnit'], number> = { day: 0, week: 1, month: 2 };

function comparePlans(a: MembershipPlan, b: MembershipPlan): number {
    if (a.durationUnit !== b.durationUnit) {
        return UNIT_ORDER[a.durationUnit] - UNIT_ORDER[b.durationUnit];
    }
    return a.durationValue - b.durationValue;
}
