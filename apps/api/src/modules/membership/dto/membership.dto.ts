import { CustomerMembership, FreezeEvent, MembershipPlan, TMembershipStatus } from '@fitcalendar/db';
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

export class CurrentFreezeDto {
    @ApiProperty() id: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) startDate: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) endDate: string;
    @ApiProperty() durationDays: number;
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
    @ApiProperty({ type: CurrentFreezeDto, nullable: true })
    currentFreeze: CurrentFreezeDto | null;
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

export function toCurrentFreeze(freeze: FreezeEvent | null): CurrentFreezeDto | null {
    if (!freeze) return null;
    return {
        id: freeze.id,
        startDate: format(freeze.startDate, 'yyyy-MM-dd'),
        endDate: format(freeze.endDate, 'yyyy-MM-dd'),
        durationDays: freeze.durationDays,
    };
}

export function toMembershipResponse(
    membership: CustomerMembership,
    options: { now?: Date; currentFreeze?: FreezeEvent | null } = {},
): MembershipResponseDto {
    const now = options.now ?? new Date();
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
        currentFreeze: toCurrentFreeze(options.currentFreeze ?? null),
        createdAt: membership.createdAt,
    };
}
