import { TrimToUndefinedTransformer } from '@fitcalendar/nest-shared';
import { RUSSIA_TIME_ZONE_IDS } from '@fitcalendar/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

import { DayHoursDto } from './working-hours.dto';
import { IsWorkingHours } from './working-hours.validator';

export class UpdateClubInfoDto {
    @ApiProperty({ minLength: 1, maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

    @ApiProperty({ description: 'Club IANA timezone (one of the supported Russian zones)' })
    @IsString()
    @IsIn(RUSSIA_TIME_ZONE_IDS)
    timezone: string;

    @ApiProperty({ maxLength: 500 })
    @IsString()
    @MaxLength(500)
    address: string;

    @ApiPropertyOptional({ maxLength: 50 })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    phone?: string;

    @ApiProperty({
        description: 'Per-day working hours map. Keys: monday..sunday. Null means closed that day.',
        example: { monday: { open: '09:00', close: '22:00' }, sunday: null },
    })
    @IsWorkingHours()
    workingHours: Record<string, DayHoursDto | null>;

    @ApiPropertyOptional({ description: 'Maps URL (Yandex Maps, etc.) for the club location', maxLength: 500 })
    @IsOptional()
    @Transform(TrimToUndefinedTransformer)
    @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
    @MaxLength(500)
    mapUrl?: string;
}
