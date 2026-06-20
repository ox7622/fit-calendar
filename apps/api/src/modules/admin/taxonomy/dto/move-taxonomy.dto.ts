import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export type TMoveDirection = 'up' | 'down';

export class MoveTaxonomyDto {
    @ApiProperty({ enum: ['up', 'down'] })
    @IsIn(['up', 'down'])
    direction: TMoveDirection;
}
