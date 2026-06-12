import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export const BULK_DELETE_MAX = 200;

export class BulkDeleteScheduleDto {
    @ApiProperty({
        type: [String],
        format: 'uuid',
        description: `Schedule entry UUIDs to delete (1..${BULK_DELETE_MAX}).`,
    })
    @IsArray()
    @ArrayNotEmpty()
    @ArrayMaxSize(BULK_DELETE_MAX)
    @IsUUID('all', { each: true })
    ids: string[];
}

/** Why a requested id was NOT deleted. */
export type TSkipReason = 'not_found' | 'has_subscribers';

export class SkippedDeleteDto {
    @ApiProperty({ format: 'uuid' }) id: string;
    @ApiProperty({ enum: ['not_found', 'has_subscribers'] }) reason: TSkipReason;
}

export class BulkDeleteResponseDto {
    @ApiProperty({
        type: [String],
        format: 'uuid',
        description: 'Ids that were removed.',
    })
    deleted: string[];

    @ApiProperty({
        type: [SkippedDeleteDto],
        description: 'Ids that were kept, with the reason (missing, or has subscribers — cancel those instead).',
    })
    skipped: SkippedDeleteDto[];
}
