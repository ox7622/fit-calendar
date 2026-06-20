import { FreezeEvent } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';
import { format } from 'date-fns';

import { MembershipResponseDto } from './membership.dto';

export class FreezeEventDto {
    @ApiProperty() id: string;
    @ApiProperty() customerMembershipId: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) startDate: string;
    @ApiProperty({ description: 'YYYY-MM-DD' }) endDate: string;
    @ApiProperty() durationDays: number;
    @ApiProperty({ nullable: true, type: String }) notes: string | null;
    @ApiProperty() recordedByAdminId: string;
    @ApiProperty() createdAt: string;
}

export class FreezeResultDto {
    @ApiProperty({ type: FreezeEventDto }) freeze: FreezeEventDto;
    @ApiProperty({ type: MembershipResponseDto }) membership: MembershipResponseDto;
}

export class UndoFreezeResultDto {
    @ApiProperty({ type: MembershipResponseDto }) membership: MembershipResponseDto;
}

export class FreezeErrorBodyDto {
    @ApiProperty({
        enum: ['INSUFFICIENT_FREEZE_DAYS', 'MEMBERSHIP_NOT_ACTIVE', 'FREEZE_OVERLAPS_EXISTING', 'INVALID_DURATION'],
    })
    code: string;

    @ApiProperty() message: string;
}

export function toFreezeDto(freeze: FreezeEvent): FreezeEventDto {
    return {
        id: freeze.id,
        customerMembershipId: freeze.customerMembershipId,
        startDate: format(freeze.startDate, 'yyyy-MM-dd'),
        endDate: format(freeze.endDate, 'yyyy-MM-dd'),
        durationDays: freeze.durationDays,
        notes: freeze.notes,
        recordedByAdminId: freeze.recordedByAdminId,
        createdAt: freeze.createdAt.toISOString(),
    };
}
