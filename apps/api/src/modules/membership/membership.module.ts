import { Customer, CustomerMembership, GuestVisit, MembershipPlan } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../admin/auth';

import { AdminMembershipController } from './admin-membership.controller';
import { MeMembershipController } from './me-membership.controller';
import { MembershipExpirationService } from './membership-expiration.service';
import { MembershipService } from './membership.service';

@Module({
    imports: [TypeOrmModule.forFeature([CustomerMembership, Customer, MembershipPlan, GuestVisit]), AdminAuthModule],
    controllers: [AdminMembershipController, MeMembershipController],
    providers: [MembershipService, MembershipExpirationService],
    exports: [MembershipService],
})
export class MembershipModule {}
