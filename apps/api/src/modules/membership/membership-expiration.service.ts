import { CustomerMembership } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

@Injectable()
export class MembershipExpirationService {
    private readonly logger = new Logger(MembershipExpirationService.name);

    constructor(
        @InjectRepository(CustomerMembership)
        private readonly membershipRepo: Repository<CustomerMembership>,
    ) {}

    /**
     * Story 7.4 — flips `active → expired` once per day at midnight.
     * Cheap single UPDATE with an indexed status filter. Day-boundary
     * coarseness is acceptable since plan durations are coarse anyway
     * (members are still active at 23:59 on their last day).
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async expirePastMemberships(): Promise<void> {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const result = await this.membershipRepo.update(
            { status: 'active', endDate: LessThan(today) },
            { status: 'expired' },
        );
        const affected = result.affected ?? 0;
        if (affected > 0) {
            this.logger.log(`Expired ${affected} membership(s)`);
        }
    }
}
