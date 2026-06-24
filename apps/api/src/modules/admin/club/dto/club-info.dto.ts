import { ClubInfo, TWorkingHours } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class AdminClubInfoDto {
    @ApiProperty() id: string;
    @ApiProperty() name: string;
    @ApiProperty() address: string;
    @ApiProperty({ nullable: true, type: String }) phone: string | null;
    @ApiProperty({
        description: 'Working hours map (lowercase day keys monday..sunday; null = closed)',
        example: { monday: { open: '09:00', close: '22:00' }, sunday: null },
    })
    workingHours: TWorkingHours;
    @ApiProperty({ nullable: true, type: String }) mapUrl: string | null;
    @ApiProperty({ nullable: true, type: String }) logoUrl: string | null;
    @ApiProperty() updatedAt: Date;
}

// Pins the response shape declared on AdminClubInfoDto so future ClubInfo
// fields don't silently leak through the controller into Swagger / the wire.
export function toAdminClubInfoDto(club: ClubInfo): AdminClubInfoDto {
    return {
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        workingHours: club.workingHours,
        mapUrl: club.mapUrl,
        logoUrl: club.logoUrl,
        updatedAt: club.updatedAt,
    };
}
