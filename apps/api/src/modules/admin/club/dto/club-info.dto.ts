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
    @ApiProperty({ nullable: true, type: Number }) latitude: number | null;
    @ApiProperty({ nullable: true, type: Number }) longitude: number | null;
    @ApiProperty({ nullable: true, type: String }) logoUrl: string | null;
    @ApiProperty() updatedAt: Date;
}

export function toAdminClubInfoDto(club: ClubInfo): AdminClubInfoDto {
    // Postgres numeric columns surface as strings via TypeORM; coerce so the
    // admin form gets real numbers without per-call massaging.
    const lat = club.latitude;
    const lon = club.longitude;
    return {
        id: club.id,
        name: club.name,
        address: club.address,
        phone: club.phone,
        workingHours: club.workingHours,
        latitude: lat === null || lat === undefined ? null : Number(lat),
        longitude: lon === null || lon === undefined ? null : Number(lon),
        logoUrl: club.logoUrl,
        updatedAt: club.updatedAt,
    };
}
