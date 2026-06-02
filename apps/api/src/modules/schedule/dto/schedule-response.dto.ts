import { ApiProperty } from '@nestjs/swagger';

export class ClassResponseDto {
    @ApiProperty({ description: 'Schedule entry UUID' })
    id: string;

    @ApiProperty({ description: 'Training type name' })
    name: string;

    @ApiProperty({ description: 'Training type description', nullable: true })
    description: string | null;

    @ApiProperty({ description: 'Start time in ISO 8601 format' })
    startTime: string;

    @ApiProperty({ description: 'End time in ISO 8601 format (computed from startTime + durationMinutes)' })
    endTime: string;

    @ApiProperty({ description: 'Duration in minutes' })
    durationMinutes: number;

    @ApiProperty({ description: 'Class status', enum: ['scheduled', 'cancelled'] })
    status: 'scheduled' | 'cancelled';

    @ApiProperty({ description: 'Coach UUID' })
    coachId: string;

    @ApiProperty({ description: 'Coach display name' })
    coachName: string;

    @ApiProperty({ description: 'Coach photo URL', nullable: true })
    coachPhotoUrl: string | null;

    @ApiProperty({ description: 'Difficulty level', enum: ['beginner', 'intermediate', 'advanced'] })
    difficulty: 'beginner' | 'intermediate' | 'advanced';

    @ApiProperty({ description: 'Impact types (e.g. cardio, strength)', type: [String] })
    impactTypes: string[];

    @ApiProperty({ description: 'Required equipment list', type: [String] })
    equipment: string[];
}
