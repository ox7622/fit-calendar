import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelClassDto {
    @ApiPropertyOptional({
        description:
            'Optional free-text cancellation reason (max 500 chars). Surfaced to subscribers in the notification.',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;

    @ApiPropertyOptional({
        description: 'When false, cancel without pushing a notification to users. Default true.',
    })
    @IsOptional()
    @IsBoolean()
    notify?: boolean;
}
