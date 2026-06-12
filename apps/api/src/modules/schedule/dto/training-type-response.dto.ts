import { ApiProperty } from '@nestjs/swagger';

export class TrainingTypeResponseDto {
    @ApiProperty({ description: 'TrainingType UUID' })
    id: string;

    @ApiProperty({ description: 'Training type name' })
    name: string;

    @ApiProperty({ description: 'Training type description', nullable: true })
    description: string | null;

    @ApiProperty({ description: 'Difficulty level key' })
    difficulty: string;

    @ApiProperty({ description: 'Impact types', type: [String] })
    impactTypes: string[];

    @ApiProperty({ description: 'Required equipment', type: [String] })
    equipment: string[];
}
