import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignMembershipDto {
    @ApiProperty()
    @IsUUID()
    planId: string;

    @ApiProperty({ description: 'ISO date (YYYY-MM-DD) — interpreted as midnight UTC' })
    @IsDateString()
    startDate: string;

    @ApiPropertyOptional({ maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}

export class UpdateMembershipDto {
    @ApiPropertyOptional({ description: 'YYYY-MM-DD; used by Story 7.6 freeze workflow' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ maxLength: 1000 })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
