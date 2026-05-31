import { Customer, CustomerMembership, FreezeEvent, GuestVisit, MembershipPlan, TDurationUnit } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { addDays, addMonths, addWeeks, subDays } from 'date-fns';
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';

import { PG_UNIQUE_VIOLATION } from '../../common/constants';
import { AdminAuditService } from '../admin/audit';
import type { IAuditContext } from '../admin/audit/audit-context';

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

interface IRecordFreezeInput {
    startDate: string;
    durationDays: number;
    notes?: string;
}

export interface IFreezeResult {
    freeze: FreezeEvent;
    membership: CustomerMembership;
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
        @InjectRepository(FreezeEvent)
        private readonly freezeRepo: Repository<FreezeEvent>,
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AdminAuditService,
    ) {}

    /**
     * Story 7.4 — single active membership per customer (AC4). Defensive
     * `order: { endDate: 'DESC' }` returns the latest if invariant is ever
     * violated (e.g. by a manual DB edit) so the system stays usable.
     *
     * Accepts an optional `EntityManager` so callers running inside a
     * transaction (notably `assign`, which locks the Customer row first)
     * can re-check membership state under the lock.
     */
    async getCurrentForCustomer(customerId: string, manager?: EntityManager): Promise<CustomerMembership | null> {
        const repo = manager ? manager.getRepository(CustomerMembership) : this.membershipRepo;
        return repo.findOne({
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
     *
     * The active-membership check runs INSIDE a transaction with a
     * pessimistic_write lock on the Customer row. Two concurrent assigns
     * to the same customer serialize on that lock; the second observes
     * the first's just-committed membership and returns `active_exists`
     * instead of creating a duplicate (which would silently violate AC4).
     * Customer + plan validity is checked outside the lock — those
     * failures don't race and would only waste a transaction.
     *
     * Defense in depth: there's a unique partial index
     * `uq_active_membership_per_customer` ON `customer_memberships`
     * ("customerId") WHERE status='active'. If the row lock is ever
     * bypassed (raw INSERT, a script, a future code path forgetting the
     * lock), the INSERT throws 23505 and we map it to `active_exists`.
     */
    async assign(customerId: string, dto: IAssignInput, adminId: string | null): Promise<TAssignResult> {
        const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
        if (!plan || !plan.isActive) {
            throw new BadRequestException('Абонемент не найден или неактивен');
        }

        try {
            return await this.dataSource.transaction(async (manager) => {
                const customerRepo = manager.getRepository(Customer);
                const customer = await customerRepo.findOne({
                    where: { id: customerId },
                    lock: { mode: 'pessimistic_write' },
                });
                if (!customer || !customer.isActive) {
                    throw new BadRequestException('Клиент не найден или неактивен');
                }

                const existingActive = await this.getCurrentForCustomer(customerId, manager);
                if (existingActive) {
                    return { status: 'active_exists', existingActive };
                }

                const startDate = normalizeDate(dto.startDate);
                const endDate = addByUnit(startDate, plan.durationValue, plan.durationUnit);

                const membershipRepo = manager.getRepository(CustomerMembership);
                const created = membershipRepo.create({
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
                const saved = await membershipRepo.save(created);
                // Reload with relations so the response carries the embedded plan.
                const reloaded = await membershipRepo.findOne({ where: { id: saved.id }, relations: ['plan'] });
                this.logger.log(`Assigned plan ${plan.id} to customer ${customerId} (membership ${saved.id})`);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return { status: 'created', membership: reloaded! };
            });
        } catch (err) {
            // Unique-index violation = a concurrent assign won the lock race
            // (shouldn't happen with the pessimistic_write lock, but the
            // partial index is the DB-level safety net). Re-read the winner
            // and surface it via the discriminated `active_exists` path.
            if (this.isActiveMembershipUniqueViolation(err)) {
                const winner = await this.getCurrentForCustomer(customerId);
                if (winner) {
                    this.logger.warn(
                        `Race on assign for customer ${customerId} — unique index caught it; returning active_exists`,
                    );
                    return { status: 'active_exists', existingActive: winner };
                }
            }
            throw err;
        }
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
    async undoGuestVisit(visitId: string, audit?: IAuditContext): Promise<{ remaining: number }> {
        const result = await this.dataSource.transaction(async (manager) => {
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
            return {
                remaining: membership.guestVisitsRemaining,
                membershipId: membership.id,
                visitedAt: visit.visitedAt,
            };
        });
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_guest_visit',
            resourceType: 'guest_visit',
            resourceId: visitId,
            metadata: { membershipId: result.membershipId, visitedAt: result.visitedAt },
        });
        return { remaining: result.remaining };
    }

    findFreezesByMembership(membershipId: string): Promise<FreezeEvent[]> {
        return this.freezeRepo.find({
            where: { customerMembershipId: membershipId },
            order: { startDate: 'DESC' },
        });
    }

    /**
     * Story 7.6 — record a single-contiguous freeze on an active membership.
     * AC2 caps each membership at one freeze for MVP (re-freezing is a
     * future story). The membership's `endDate` shifts forward by
     * `durationDays` immediately at record time, even if startDate is in
     * the future — see story Dev Notes "Why the freeze reservation
     * includes future starts".
     */
    async recordFreeze(membershipId: string, dto: IRecordFreezeInput, adminId: string): Promise<IFreezeResult> {
        if (!Number.isInteger(dto.durationDays) || dto.durationDays < 1) {
            throw new BadRequestException({
                statusCode: 400,
                error: 'Bad Request',
                code: 'INVALID_DURATION',
                message: 'Длительность заморозки должна быть положительным целым числом дней.',
            });
        }

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
                    message: 'Абонемент не активен — заморозка невозможна.',
                });
            }

            const freezeRepo = manager.getRepository(FreezeEvent);
            const existingCount = await freezeRepo.count({ where: { customerMembershipId: membershipId } });
            if (existingCount > 0) {
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'FREEZE_ALREADY_USED',
                    message: 'Заморозка уже использована для этого абонемента.',
                });
            }
            if (dto.durationDays > membership.freezeDaysRemaining) {
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'INSUFFICIENT_FREEZE_DAYS',
                    message:
                        `Недостаточно дней заморозки: запрошено ${dto.durationDays}, ` +
                        `доступно ${membership.freezeDaysRemaining}.`,
                });
            }

            // Parse YYYY-MM-DD directly into UTC midnight. `parseISO` followed
            // by `normalizeDate` would shift the day in non-UTC timezones
            // (parseISO interprets the string as local time, then UTC extraction
            // jumps back a calendar day in eastward zones).
            const start = parseDateOnly(dto.startDate);
            // Inclusive endDate: a 7-day freeze starting Mon ends the following Sun.
            const freezeEnd = addDays(start, dto.durationDays - 1);
            // Membership endDate shifts by durationDays (not durationDays - 1).
            membership.endDate = addDays(membership.endDate, dto.durationDays);
            membership.freezeDaysRemaining -= dto.durationDays;
            await repo.save(membership);

            const freeze = await freezeRepo.save(
                freezeRepo.create({
                    customerMembershipId: membershipId,
                    startDate: start,
                    endDate: freezeEnd,
                    durationDays: dto.durationDays,
                    notes: dto.notes?.trim() || null,
                    recordedByAdminId: adminId,
                }),
            );
            this.logger.log(`Recorded freeze ${freeze.id} for membership ${membershipId} (${dto.durationDays}d)`);
            return { freeze, membership };
        });
    }

    /**
     * Story 7.6 — undo a freeze: increment counter back, shift endDate
     * backward by `durationDays`, delete the FreezeEvent row.
     */
    async undoFreeze(freezeId: string, audit?: IAuditContext): Promise<{ membership: CustomerMembership }> {
        const result = await this.dataSource.transaction(async (manager) => {
            const freezeRepo = manager.getRepository(FreezeEvent);
            const freeze = await freezeRepo.findOne({ where: { id: freezeId } });
            if (!freeze) throw new NotFoundException(`FreezeEvent ${freezeId} not found`);

            const repo = manager.getRepository(CustomerMembership);
            const membership = await repo.findOne({
                where: { id: freeze.customerMembershipId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!membership) {
                throw new NotFoundException(`Membership ${freeze.customerMembershipId} not found`);
            }
            membership.endDate = subDays(membership.endDate, freeze.durationDays);
            membership.freezeDaysRemaining += freeze.durationDays;
            await repo.save(membership);
            await freezeRepo.delete({ id: freezeId });
            this.logger.log(`Undid freeze ${freezeId} (membership ${membership.id})`);
            return {
                membership,
                snapshot: {
                    membershipId: membership.id,
                    durationDays: freeze.durationDays,
                    startDate: freeze.startDate,
                    endDate: freeze.endDate,
                },
            };
        });
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_freeze_event',
            resourceType: 'freeze_event',
            resourceId: freezeId,
            metadata: result.snapshot,
        });
        return { membership: result.membership };
    }

    /**
     * Story 7.6 — return the freeze (if any) whose [startDate, endDate]
     * range contains today. Used by `me/membership` to surface the
     * "❄️ Заморожен" banner. Returns null when no freeze exists or
     * today is outside the freeze window.
     */
    async getActiveFreezeForMembership(membershipId: string, now: Date = new Date()): Promise<FreezeEvent | null> {
        const freezes = await this.freezeRepo.find({
            where: { customerMembershipId: membershipId },
            order: { startDate: 'DESC' },
        });
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        for (const f of freezes) {
            if (f.startDate.getTime() <= today.getTime() && today.getTime() <= f.endDate.getTime()) {
                return f;
            }
        }
        return null;
    }

    /**
     * Detects the 23505 unique-violation specifically on the
     * `uq_active_membership_per_customer` partial index. Other 23505s
     * (e.g. PK collisions if something's deeply wrong) should still
     * propagate so they don't get silently swallowed.
     */
    private isActiveMembershipUniqueViolation(err: unknown): boolean {
        if (!(err instanceof QueryFailedError)) return false;
        const driverErr = err as QueryFailedError & { code?: string; constraint?: string };
        return driverErr.code === PG_UNIQUE_VIOLATION && driverErr.constraint === 'uq_active_membership_per_customer';
    }
}

/** Postgres `date` columns surface as Date set to midnight UTC. */
function normalizeDate(input: Date | string): Date {
    const d = input instanceof Date ? input : new Date(input);
    // Strip time to midnight UTC so the column round-trips cleanly.
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Parse a YYYY-MM-DD string into UTC midnight, sidestepping `parseISO`'s
 * local-time interpretation. Used for Postgres `date` column inputs.
 */
function parseDateOnly(iso: string): Date {
    const parts = iso.split('-').map(Number);
    const [y, m, d] = parts;
    if (y === undefined || m === undefined || d === undefined) {
        throw new Error(`parseDateOnly: expected YYYY-MM-DD, got "${iso}"`);
    }
    return new Date(Date.UTC(y, m - 1, d));
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
