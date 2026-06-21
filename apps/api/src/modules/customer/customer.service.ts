import { Customer, CustomerMembership, Reminder } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';

import { normalizeRussianPhone } from '../../common/utils/phone';
import { AdminAuditService } from '../admin/audit';
import type { IAuditContext } from '../admin/audit/audit-context';

import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

export class InvalidPhoneFormatError extends Error {
    constructor() {
        super('Invalid Russian phone format');
        this.name = 'InvalidPhoneFormatError';
    }
}

export interface ITelegramIdentityForLink {
    id: number;
    username?: string;
}

export type TLinkPhoneStatus = 'linked' | 'phone_not_found' | 'phone_already_linked' | 'invalid_phone';

export type TLinkPhoneResult =
    | { status: 'linked'; customer: Customer }
    | { status: 'phone_not_found'; customer?: undefined }
    | { status: 'phone_already_linked'; customer?: undefined }
    | { status: 'invalid_phone'; customer?: undefined };

export interface IFindAllCustomersQuery {
    search?: string;
    isActive?: boolean;
    linkedOnly?: boolean;
    page?: number;
    pageSize?: number;
}

export interface IFindAllCustomersResult {
    items: Customer[];
    total: number;
    page: number;
    pageSize: number;
}

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(Reminder)
        private readonly reminderRepo: Repository<Reminder>,
        @InjectRepository(CustomerMembership)
        private readonly membershipRepo: Repository<CustomerMembership>,
        private readonly auditService: AdminAuditService,
    ) {}

    findById(id: string): Promise<Customer | null> {
        return this.customerRepo.findOne({ where: { id } });
    }

    findByTelegramId(telegramId: number): Promise<Customer | null> {
        return this.customerRepo.findOne({ where: { telegramId } });
    }

    findByPhone(normalizedPhone: string): Promise<Customer | null> {
        return this.customerRepo.findOne({ where: { phone: normalizedPhone } });
    }

    /**
     * Phone-based linking flow (AC5–AC7).
     *
     * Idempotent re-linking: if the calling Telegram identity already owns the
     * matched customer, refresh `telegramUsername` and return success rather than
     * surfacing 409. The 409 is reserved for the "claimed by a *different* Telegram
     * account" case.
     */
    async linkTelegramToPhone(rawPhone: string, telegramIdentity: ITelegramIdentityForLink): Promise<TLinkPhoneResult> {
        const normalizedPhone = normalizeRussianPhone(rawPhone);
        if (!normalizedPhone) {
            return { status: 'invalid_phone' };
        }

        const customer = await this.findByPhone(normalizedPhone);
        if (!customer) {
            return { status: 'phone_not_found' };
        }

        const incomingTelegramId = telegramIdentity.id;
        const incomingUsername = telegramIdentity.username ?? null;

        if (customer.telegramId !== null && Number(customer.telegramId) !== incomingTelegramId) {
            return { status: 'phone_already_linked' };
        }

        // Either unlinked OR re-linked to the same Telegram identity (idempotent).
        customer.telegramId = incomingTelegramId;
        customer.telegramUsername = incomingUsername;
        const saved = await this.customerRepo.save(customer);
        this.logger.log(`Linked customer ${saved.id} to Telegram id ${incomingTelegramId} (phone ${normalizedPhone})`);
        return { status: 'linked', customer: saved };
    }

    async findAll(query: IFindAllCustomersQuery): Promise<IFindAllCustomersResult> {
        const page = Math.max(1, query.page ?? 1);
        const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 50));
        const skip = (page - 1) * pageSize;

        const where: Record<string, unknown>[] = [];
        const filters: Record<string, unknown> = {};
        if (typeof query.isActive === 'boolean') {
            filters.isActive = query.isActive;
        }
        if (query.linkedOnly) {
            filters.telegramId = Not<number | null>(null as unknown as number);
        }

        const search = query.search?.trim();
        if (search) {
            const pattern = `%${search}%`;
            for (const field of ['firstName', 'lastName', 'phone', 'telegramUsername'] as const) {
                where.push({ ...filters, [field]: ILike(pattern) });
            }
        }

        const [items, total] = await this.customerRepo.findAndCount({
            where: where.length > 0 ? where : filters,
            order: { firstName: 'ASC', lastName: 'ASC' },
            take: pageSize,
            skip,
        });

        return { items, total, page, pageSize };
    }

    async create(dto: CreateCustomerDto): Promise<Customer> {
        const normalizedPhone = normalizeRussianPhone(dto.phone);
        if (!normalizedPhone) {
            throw new InvalidPhoneFormatError();
        }
        const customer = this.customerRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName ?? null,
            phone: normalizedPhone,
            email: dto.email ?? null,
            telegramId: dto.telegramId ?? null,
            telegramUsername: dto.telegramUsername ?? null,
            isActive: dto.isActive ?? true,
            notes: dto.notes ?? null,
        });
        const saved = await this.customerRepo.save(customer);
        this.logger.log(`Created customer ${saved.id} (${saved.firstName} ${saved.lastName ?? ''})`);
        return saved;
    }

    async update(id: string, dto: UpdateCustomerDto): Promise<Customer | null> {
        const customer = await this.findById(id);
        if (!customer) return null;

        if (dto.phone !== undefined) {
            const normalizedPhone = normalizeRussianPhone(dto.phone);
            if (!normalizedPhone) {
                throw new InvalidPhoneFormatError();
            }
            customer.phone = normalizedPhone;
        }
        if (dto.firstName !== undefined) customer.firstName = dto.firstName;
        if (dto.lastName !== undefined) customer.lastName = dto.lastName ?? null;
        if (dto.email !== undefined) customer.email = dto.email ?? null;
        if (dto.telegramId !== undefined) customer.telegramId = dto.telegramId ?? null;
        if (dto.telegramUsername !== undefined) customer.telegramUsername = dto.telegramUsername ?? null;
        if (dto.isActive !== undefined) customer.isActive = dto.isActive;
        if (dto.notes !== undefined) customer.notes = dto.notes ?? null;

        const saved = await this.customerRepo.save(customer);
        this.logger.log(`Updated customer ${saved.id}`);
        return saved;
    }

    /**
     * Story 5.2 — update the member's reminder offset preference. The DTO
     * already gates `reminderMinutes` against the allowed enum, so this method
     * doesn't re-validate.
     */
    async updateReminderMinutes(customerId: string, reminderMinutes: number): Promise<Customer | null> {
        const customer = await this.findById(customerId);
        if (!customer) return null;
        customer.reminderMinutes = reminderMinutes;
        const saved = await this.customerRepo.save(customer);
        this.logger.log(`Updated reminderMinutes=${reminderMinutes} for customer ${customerId}`);
        return saved;
    }

    async unlinkTelegram(id: string): Promise<Customer | null> {
        const customer = await this.findById(id);
        if (!customer) return null;
        customer.telegramId = null;
        customer.telegramUsername = null;
        const saved = await this.customerRepo.save(customer);
        this.logger.log(`Unlinked Telegram identity from customer ${id}`);
        return saved;
    }

    /**
     * Returns: 'deleted' | 'not_found' | 'has_dependencies'.
     *
     * Hard delete cascades aggressively — Customer → CustomerMembership →
     * GuestVisit + FreezeEvent (all `ON DELETE CASCADE`), and Customer →
     * Reminder (also CASCADE). A successful hard delete here silently
     * wipes the customer's entire history. We refuse if ANY of those
     * dependent rows exist; the everyday path is `isActive=false` (soft
     * delete via update), which preserves history.
     *
     * Memberships count any status (active / expired / cancelled) — cancelled
     * is still audit trail, and we shouldn't drop the customer record if it
     * leaves orphan historical memberships unresolvable.
     */
    async deleteCustomer(id: string, audit?: IAuditContext): Promise<'deleted' | 'not_found' | 'has_dependencies'> {
        const customer = await this.findById(id);
        if (!customer) return 'not_found';
        const [reminderCount, membershipCount] = await Promise.all([
            this.reminderRepo.count({ where: { customerId: id } }),
            this.membershipRepo.count({ where: { customerId: id } }),
        ]);
        if (reminderCount > 0 || membershipCount > 0) {
            return 'has_dependencies';
        }
        const snapshot = { phone: customer.phone, firstName: customer.firstName, lastName: customer.lastName };
        await this.customerRepo.remove(customer);
        this.logger.log(`Deleted customer ${id}`);
        await this.auditService.record({
            adminUserId: audit?.adminUserId ?? null,
            ipAddress: audit?.ipAddress ?? null,
            action: 'delete_customer',
            resourceType: 'customer',
            resourceId: id,
            metadata: snapshot,
        });
        return 'deleted';
    }
}
