import { ApiProperty } from '@nestjs/swagger';

export interface IWorkingHoursEntryDto {
    open: string;
    close: string;
}

export class ClubInfoDto {
    @ApiProperty({ description: 'Club UUID' })
    id: string;

    @ApiProperty({ description: 'Club name' })
    name: string;

    @ApiProperty({ description: 'Club address' })
    address: string;

    @ApiProperty({ description: 'Club phone number', nullable: true })
    phone: string | null;

    @ApiProperty({
        description: 'Working hours per day (Mon/Tue/Wed/Thu/Fri/Sat/Sun), null means closed',
        example: { Mon: { open: '09:00', close: '21:00' }, Sun: null },
    })
    workingHours: Record<string, IWorkingHoursEntryDto | null>;

    @ApiProperty({ description: 'External maps URL (Yandex Maps, etc.) for the club location', nullable: true })
    mapUrl: string | null;

    @ApiProperty({ description: 'Club logo URL', nullable: true })
    logoUrl: string | null;

    @ApiProperty({ description: 'Club IANA timezone, e.g. Europe/Moscow' })
    timezone: string;
}
