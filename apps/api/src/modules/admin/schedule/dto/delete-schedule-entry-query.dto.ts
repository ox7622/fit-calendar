import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Query for DELETE /admin/schedule/:id. `notify=false` deletes without pushing
 * to users. Query values arrive as strings, so coerce explicitly — implicit
 * boolean conversion would turn the non-empty string "false" into `true`.
 */
export class DeleteScheduleEntryQueryDto {
    @ApiPropertyOptional({ description: 'Set false to delete without notifying users. Default true.' })
    @IsOptional()
    @Transform(({ value }) => value !== 'false' && value !== false)
    @IsBoolean()
    notify?: boolean = true;
}
