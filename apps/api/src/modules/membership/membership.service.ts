import { Customer, CustomerMembership, MembershipPlan, TDurationUnit } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { Repository } from 'typeorm';

export type TAssignResult =
    | { status: 'created'; membership: CustomerMembership }
    | { status: 'active_exists'; existingActive: CustomerMembership };

interface IAssignInput {
    planId: string;
    startDate: Date;
    notes?: string;
}

interface IUpdateInput {
    endDate?: Date;
    notes?: string | null;
}

@Injectable()
export class MembershipService {
    private readonly logger = new Logger(MembershipService.name);

    constructor(
        @InjectRepository(CustomerMembership)
        private readonly membershipRepo: Repository<CustomerMembership>,
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(MembershipPlan)
        private readonly planRepo: Repository<MembershipPlan>,
    ) {}

    /**
     * Story 7.4 — single active membership per customer (AC4). Defensive
     * `order: { endDate: 'DESC' }` returns the latest if invariant is ever
     * violated (e.g. by a manual DB edit) so the system stays usable.
     */
    async getCurrentForCustomer(customerId: string): Promise<CustomerMembership | null> {
        return this.membershipRepo.findOne({
            where: { customerId, status: 'active' },
            relations: ['plan'],
            order: { endDate: 'DESC' },
        });
    }

    findHistoryForCustomer(customerId: string): Promise<CustomerMembership[]> {
        return this.membershipRepo.find({
            where: { customerId },
            relations: ['plan'],
            order: { startDate: 'DESC' },
        });
    }

    findById(id: string): Promise<CustomerMembership | null> {
        return this.membershipRepo.findOne({ where: { id }, relations: ['plan', 'customer'] });
    }

    /**
     * Story 7.4 — discriminated return so the controller can map
     * `active_exists` → 409 with the existing membership's identifiers.
     * Per Dev Notes, this is deliberately NOT a magic upsert; the admin
     * confirms cancel-then-create as two explicit calls.
     */
    async assign(customerId: string, dto: IAssignInput, adminId: string | null): Promise<TAssignResult> {
        const customer = await this.customerRepo.findOne({ where: { id: customerId } });
        if (!customer || !customer.isActive) {
            throw new BadRequestException('Клиент не найден или неактивен');
        }
        const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
        if (!plan || !plan.isActive) {
            throw new BadRequestException('Абонемент не найден или неактивен');
        }

        const existingActive = await this.getCurrentForCustomer(customerId);
        if (existingActive) {
            return { status: 'active_exists', existingActive };
        }

        const startDate = normalizeDate(dto.startDate);
        const endDate = addByUnit(startDate, plan.durationValue, plan.durationUnit);

        const created = this.membershipRepo.create({
            customerId,
            planId: plan.id,
            startDate,
            endDate,
            guestVisitsRemaining: plan.guestVisitsAllowed,
            freezeDaysRemaining: plan.freezeDaysAllowed,
            status: 'active',
            notes: dto.notes?.trim() || null,
            createdByAdminId: adminId,
        });
        const saved = await this.membershipRepo.save(created);
        // Reload with relations so the response carries the embedded plan.
        const reloaded = await this.membershipRepo.findOne({ where: { id: saved.id }, relations: ['plan'] });
        this.logger.log(`Assigned plan ${plan.id} to customer ${customerId} (membership ${saved.id})`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { status: 'created', membership: reloaded! };
    }

    /**
     * Story 7.4 — only `endDate` + `notes` are editable. `endDate` shifts
     * are how Story 7.6's freeze workflow lengthens an expiry. Other fields
     * are not mutable post-assignment.
     */
    async updateMembership(id: string, dto: IUpdateInput): Promise<CustomerMembership> {
        const existing = await this.membershipRepo.findOne({ where: { id } });
        if (!existing) throw new NotFoundException(`Membership ${id} not found`);
        if (dto.endDate !== undefined) existing.endDate = normalizeDate(dto.endDate);
        if (dto.notes !== undefined) existing.notes = dto.notes?.trim() || null;
        await this.membershipRepo.save(existing);
        const reloaded = await this.membershipRepo.findOne({ where: { id }, relations: ['plan'] });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return reloaded!;
    }

    /**
     * Story 7.4 — idempotent. Re-cancelling a cancelled membership returns
     * the existing record unchanged so the admin UI can hammer the button
     * without surprises.
     */
    async cancel(id: string): Promise<CustomerMembership> {
        const existing = await this.membershipRepo.findOne({ where: { id }, relations: ['plan'] });
        if (!existing) throw new NotFoundException(`Membership ${id} not found`);
        if (existing.status === 'cancelled') return existing;
        existing.status = 'cancelled';
        await this.membershipRepo.save(existing);
        this.logger.log(`Cancelled membership ${id}`);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return (await this.membershipRepo.findOne({ where: { id }, relations: ['plan'] }))!;
    }
}

/** Postgres `date` columns surface as Date set to midnight UTC. */
function normalizeDate(input: Date | string): Date {
    const d = input instanceof Date ? input : new Date(input);
    // Strip time to midnight UTC so the column round-trips cleanly.
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function addByUnit(startDate: Date, value: number, unit: TDurationUnit): Date {
    switch (unit) {
        case 'day':
            return addDays(startDate, value);
        case 'week':
            return addWeeks(startDate, value);
        case 'month':
            return addMonths(startDate, value);
        default:
            throw new Error(`Unknown duration unit: ${unit as string}`);
    }
}
