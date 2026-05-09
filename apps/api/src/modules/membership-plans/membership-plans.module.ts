import { MembershipPlan } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../admin/auth';

import { AdminMembershipPlansController } from './admin-membership-plans.controller';
import { MembershipPlansController } from './membership-plans.controller';
import { MembershipPlansService } from './membership-plans.service';

@Module({
    // AdminAuthModule re-exports JwtModule + AdminAuthGuard so the admin
    // controller can resolve the guard's dependencies.
    imports: [TypeOrmModule.forFeature([MembershipPlan]), AdminAuthModule],
    controllers: [MembershipPlansController, AdminMembershipPlansController],
    providers: [MembershipPlansService],
    exports: [MembershipPlansService],
})
export class MembershipPlansModule {}
