import { ApiProperty } from '@nestjs/swagger';

export class LabelValueDto {
    @ApiProperty({ description: 'Internal value / key' })
    value: string;

    @ApiProperty({ description: 'Human-readable Russian label' })
    label: string;
}
