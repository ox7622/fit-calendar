import { CustomerMembership, MembershipPlan, TMembershipStatus } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';
import { differenceInCalendarDays, format } from 'date-fns';

export class MembershipPlanSnapshotDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiProperty() durationValue: number;
    @ApiProperty() durationUnit: 'day' | 'week' | 'month';
    @ApiProperty({ type: [String] }) features: string[];
    @ApiProperty() guestVisitsAllowed: number;
    @ApiProperty() freezeDaysAllowed: number;
    @ApiProperty() priceRub: number;
}

export class MembershipResponseDto {
    @ApiProperty() id: string;
    @ApiProperty() customerId: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) startDate: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) endDate: string;
    @ApiProperty({ description: 'Floored to 0 once endDate is past' }) daysRemaining: number;
    @ApiProperty() guestVisitsRemaining: number;
    @ApiProperty() freezeDaysRemaining: number;
    @ApiProperty({ enum: ['active', 'expired', 'cancelled'] }) status: TMembershipStatus;
    @ApiProperty({ nullable: true, type: String }) notes: string | null;
    @ApiProperty({ type: MembershipPlanSnapshotDto }) plan: MembershipPlanSnapshotDto;
    @ApiProperty() createdAt: Date;
}

export class MeMembershipResponseDto {
    @ApiProperty({ type: MembershipResponseDto, nullable: true })
    membership: MembershipResponseDto | null;
}

export class ActiveExistsErrorDto {
    @ApiProperty({ example: 'ACTIVE_MEMBERSHIP_EXISTS' }) code: string;
    @ApiProperty() message: string;
    @ApiProperty({
        type: 'object',
        properties: { id: { type: 'string' }, endDate: { type: 'string' } },
    })
    existingActive: { id: string; endDate: string };
}

export function toPlanSnapshot(plan: MembershipPlan): MembershipPlanSnapshotDto {
    return {
        id: plan.id,
        name: plan.name,
        durationValue: plan.durationValue,
        durationUnit: plan.durationUnit,
        features: plan.features,
        guestVisitsAllowed: plan.guestVisitsAllowed,
        freezeDaysAllowed: plan.freezeDaysAllowed,
        priceRub: plan.priceRub,
    };
}

export function toMembershipResponse(membership: CustomerMembership, now: Date = new Date()): MembershipResponseDto {
    const days = differenceInCalendarDays(membership.endDate, now);
    return {
        id: membership.id,
        customerId: membership.customerId,
        startDate: format(membership.startDate, 'yyyy-MM-dd'),
        endDate: format(membership.endDate, 'yyyy-MM-dd'),
        daysRemaining: Math.max(0, days),
        guestVisitsRemaining: membership.guestVisitsRemaining,
        freezeDaysRemaining: membership.freezeDaysRemaining,
        status: membership.status,
        notes: membership.notes,
        plan: toPlanSnapshot(membership.plan),
        createdAt: membership.createdAt,
    };
}
