import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class DayHoursDto {
    @ApiProperty({ example: '09:00' })
    @IsString()
    @Matches(HH_MM, { message: 'open must be HH:mm 24-hour format' })
    open: string;

    @ApiProperty({ example: '22:00' })
    @IsString()
    @Matches(HH_MM, { message: 'close must be HH:mm 24-hour format' })
    close: string;
}
