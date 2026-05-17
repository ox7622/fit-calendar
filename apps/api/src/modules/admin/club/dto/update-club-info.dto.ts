import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsLatitude,
    IsLongitude,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';

import { DayHoursDto } from './working-hours.dto';

export class UpdateClubInfoDto {
    @ApiProperty({ minLength: 1, maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    name: string;

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
    @IsObject()
    @ValidateNested({ each: true })
    @Type(() => DayHoursDto)
    workingHours: Record<string, DayHoursDto | null>;

    @ApiPropertyOptional()
    @IsOptional()
    @IsLatitude()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsLongitude()
    longitude?: number;
}
