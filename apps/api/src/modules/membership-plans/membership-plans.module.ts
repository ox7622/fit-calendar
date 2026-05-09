import { MembershipPlan } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminMembershipPlansController } from './admin-membership-plans.controller';
import { MembershipPlansController } from './membership-plans.controller';
import { MembershipPlansService } from './membership-plans.service';

@Module({
    imports: [TypeOrmModule.forFeature([MembershipPlan])],
    controllers: [MembershipPlansController, AdminMembershipPlansController],
    providers: [MembershipPlansService],
    exports: [MembershipPlansService],
})
export class MembershipPlansModule {}
