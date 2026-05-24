import { Customer, CustomerMembership, GuestVisit, MembershipPlan, TDurationUnit } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { DataSource, Repository } from 'typeorm';

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

interface IRecordGuestVisitInput {
    visitedAt?: Date;
    notes?: string;
}

export interface IGuestVisitResult {
    visit: GuestVisit;
    remaining: number;
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
        @InjectRepository(GuestVisit)
        private readonly guestVisitRepo: Repository<GuestVisit>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
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

    findGuestVisitsByMembership(membershipId: string): Promise<GuestVisit[]> {
        return this.guestVisitRepo.find({
            where: { customerMembershipId: membershipId },
            order: { visitedAt: 'DESC' },
        });
    }

    /**
     * Story 7.5 — record a guest visit atomically with the counter
     * decrement. Pessimistic write lock on the membership row prevents
     * two concurrent admin clicks from both reading `remaining: 1` and
     * each inserting a visit (leaving the counter +1 too low).
     *
     * Status + counter guards happen inside the transaction so the lock
     * covers both the read-of-state and the write-of-state.
     */
    async recordGuestVisit(
        membershipId: string,
        dto: IRecordGuestVisitInput,
        adminId: string,
    ): Promise<IGuestVisitResult> {
        return this.dataSource.transaction(async (manager) => {
            const repo = manager.getRepository(CustomerMembership);
            const membership = await repo.findOne({
                where: { id: membershipId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!membership) throw new NotFoundException(`Membership ${membershipId} not found`);
            if (membership.status !== 'active') {
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'MEMBERSHIP_NOT_ACTIVE',
                    message: 'Абонемент не активен — нельзя записать гостевой визит.',
                });
            }
            if (membership.guestVisitsRemaining <= 0) {
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'NO_GUEST_VISITS_REMAINING',
                    message: 'Гостевые визиты исчерпаны.',
                });
            }
            membership.guestVisitsRemaining -= 1;
            await repo.save(membership);

            const visitRepo = manager.getRepository(GuestVisit);
            const visit = await visitRepo.save(
                visitRepo.create({
                    customerMembershipId: membershipId,
                    visitedAt: dto.visitedAt ?? new Date(),
                    notes: dto.notes?.trim() || null,
                    recordedByAdminId: adminId,
                }),
            );
            this.logger.log(`Recorded guest visit ${visit.id} for membership ${membershipId}`);
            return { visit, remaining: membership.guestVisitsRemaining };
        });
    }

    /**
     * Story 7.5 — undo a recorded visit (admin fat-finger correction).
     * Increment is NOT capped at `plan.guestVisitsAllowed`; if state ever
     * drifts, the admin UI surfaces it visibly and reception can fix
     * manually. YAGNI on the cap.
     */
    async undoGuestVisit(visitId: string): Promise<{ remaining: number }> {
        return this.dataSource.transaction(async (manager) => {
            const visitRepo = manager.getRepository(GuestVisit);
            const visit = await visitRepo.findOne({ where: { id: visitId } });
            if (!visit) throw new NotFoundException(`GuestVisit ${visitId} not found`);

            const repo = manager.getRepository(CustomerMembership);
            const membership = await repo.findOne({
                where: { id: visit.customerMembershipId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!membership) {
                // CASCADE on delete should make this unreachable in practice.
                throw new NotFoundException(`Membership ${visit.customerMembershipId} not found`);
            }
            membership.guestVisitsRemaining += 1;
            await repo.save(membership);
            await visitRepo.delete({ id: visitId });
            this.logger.log(`Undid guest visit ${visitId} (membership ${membership.id})`);
            return { remaining: membership.guestVisitsRemaining };
        });
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
