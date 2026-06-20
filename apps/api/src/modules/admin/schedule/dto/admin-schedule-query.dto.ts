import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type TAdminScheduleStatusFilter = 'scheduled' | 'cancelled' | 'all';
const VALID_STATUS_FILTERS: TAdminScheduleStatusFilter[] = ['scheduled', 'cancelled', 'all'];

const toInt = ({ value }: { value: unknown }): number | undefined => {
    if (value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : undefined;
};

export class AdminScheduleQueryDto {
    @ApiPropertyOptional({ description: 'Range start (ISO 8601). Default = start of current week.' })
    @IsOptional()
    @IsISO8601()
    from?: string;

    @ApiPropertyOptional({ description: 'Range end (ISO 8601). Default = +14 days.' })
    @IsOptional()
    @IsISO8601()
    to?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    coachId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    trainingTypeId?: string;

    @ApiPropertyOptional({ enum: VALID_STATUS_FILTERS, default: 'all' })
    @IsOptional()
    @IsString()
    status?: TAdminScheduleStatusFilter;

    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @Transform(toInt)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
    @IsOptional()
    @Transform(toInt)
    @IsInt()
    @Min(1)
    @Max(200)
    pageSize?: number;
}
