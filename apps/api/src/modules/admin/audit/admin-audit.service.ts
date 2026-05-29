import { AdminAuditAction, AdminAuditLog } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface IRecordAuditInput {
    adminUserId: string | null;
    action: AdminAuditAction;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
}

@Injectable()
export class AdminAuditService {
    private readonly logger = new Logger(AdminAuditService.name);

    constructor(
        @InjectRepository(AdminAuditLog)
        private readonly repo: Repository<AdminAuditLog>,
    ) {}

    // Records a destructive admin action. Best-effort: a failed audit insert
    // is logged but never thrown, because audit is a side trail, not part of
    // the user-visible operation's contract. If the trail goes silent, ops
    // will notice via Sentry on the `Failed to record admin audit` log, not
    // via customer-facing failures.
    async record(input: IRecordAuditInput): Promise<void> {
        try {
            const entity = this.repo.create({
                adminUserId: input.adminUserId,
                action: input.action,
                resourceType: input.resourceType,
                resourceId: input.resourceId,
                metadata: input.metadata ?? null,
                ipAddress: input.ipAddress ?? null,
            });
            await this.repo.save(entity);
        } catch (err) {
            this.logger.error({ err, input }, 'Failed to record admin audit entry');
        }
    }
}
