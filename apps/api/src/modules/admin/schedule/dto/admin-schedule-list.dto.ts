import type { ScheduleEntry, TScheduleStatus } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

class CoachSnapshotDto {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Мария Иванова' }) name: string;
    @ApiProperty({ nullable: true }) photoUrl: string | null;
}

class TrainingTypeSnapshotDto {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Йога' }) name: string;
    @ApiProperty({ enum: ['beginner', 'intermediate', 'advanced'] }) difficulty: string;
}

export class AdminScheduleItemDto {
    @ApiProperty() id: string;
    @ApiProperty({ type: String, format: 'date-time' }) startTime: Date;
    @ApiProperty({ example: 60 }) durationMinutes: number;
    @ApiProperty({ enum: ['scheduled', 'cancelled'] }) status: TScheduleStatus;
    @ApiProperty({ nullable: true }) cancellationReason: string | null;
    @ApiProperty({ type: TrainingTypeSnapshotDto }) trainingType: TrainingTypeSnapshotDto;
    @ApiProperty({ type: CoachSnapshotDto }) coach: CoachSnapshotDto;
}

export class AdminScheduleListResponseDto {
    @ApiProperty({ type: [AdminScheduleItemDto] }) items: AdminScheduleItemDto[];
    @ApiProperty({ example: 42 }) total: number;
    @ApiProperty({ example: 1 }) page: number;
    @ApiProperty({ example: 50 }) pageSize: number;
}

export function toAdminScheduleItem(entry: ScheduleEntry): AdminScheduleItemDto {
    return {
        id: entry.id,
        startTime: entry.startTime,
        durationMinutes: entry.durationMinutes,
        status: entry.status,
        cancellationReason: entry.cancellationReason ?? null,
        trainingType: {
            id: entry.trainingType.id,
            name: entry.trainingType.name,
            difficulty: entry.trainingType.difficulty,
        },
        coach: {
            id: entry.coach.id,
            name: entry.coach.name,
            photoUrl: entry.coach.photoUrl ?? null,
        },
    };
}
