import { GuestVisit } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class GuestVisitDto {
    @ApiProperty() id: string;
    @ApiProperty() customerMembershipId: string;
    @ApiProperty() visitedAt: string;
    @ApiProperty({ nullable: true, type: String }) notes: string | null;
    @ApiProperty() recordedByAdminId: string;
    @ApiProperty() createdAt: string;
}

export class GuestVisitResultDto {
    @ApiProperty({ type: GuestVisitDto }) visit: GuestVisitDto;
    @ApiProperty() remaining: number;
}

export class UndoGuestVisitResultDto {
    @ApiProperty() remaining: number;
}

export function toGuestVisitDto(visit: GuestVisit): GuestVisitDto {
    return {
        id: visit.id,
        customerMembershipId: visit.customerMembershipId,
        visitedAt: visit.visitedAt.toISOString(),
        notes: visit.notes,
        recordedByAdminId: visit.recordedByAdminId,
        createdAt: visit.createdAt.toISOString(),
    };
}
