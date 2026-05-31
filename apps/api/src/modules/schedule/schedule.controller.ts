import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { LabelValueDto } from './dto/label-value.dto';
import { ScheduleFilterDto } from './dto/schedule-filter.dto';
import { ClassResponseDto } from './dto/schedule-response.dto';
import { TrainingTypeResponseDto } from './dto/training-type-response.dto';
import { WeekScheduleDto } from './dto/week-schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('Schedule')
@Controller('schedule')
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    // ─── Metadata endpoints ───────────────────────────────────────────

    @Get('metadata/training-types')
    @ApiOperation({ summary: 'Get all active training types' })
    @ApiResponse({ status: 200, description: 'List of active training types', type: [TrainingTypeResponseDto] })
    async getTrainingTypes(): Promise<TrainingTypeResponseDto[]> {
        return this.scheduleService.getTrainingTypes();
    }

    @Get('metadata/difficulty-levels')
    @ApiOperation({ summary: 'Get difficulty level options' })
    @ApiResponse({ status: 200, description: 'Difficulty levels', type: [LabelValueDto] })
    getDifficultyLevels(): LabelValueDto[] {
        return this.scheduleService.getDifficultyLevels();
    }

    @Get('metadata/impact-types')
    @ApiOperation({ summary: 'Get impact type options' })
    @ApiResponse({ status: 200, description: 'Impact types', type: [LabelValueDto] })
    getImpactTypes(): LabelValueDto[] {
        return this.scheduleService.getImpactTypes();
    }

    // ─── Schedule endpoints (public catalog) ──────────────────────────

    @Get('today')
    @ApiOperation({ summary: "Get today's schedule" })
    @ApiQuery({ name: 'difficultyLevel', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
    @ApiQuery({ name: 'coachId', required: false, type: String })
    @ApiQuery({ name: 'trainingTypeId', required: false, type: String })
    @ApiQuery({
        name: 'impactType',
        required: false,
        type: String,
        description: 'Comma-separated impact types, e.g. cardio,strength',
    })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: "Today's schedule", type: [ClassResponseDto] })
    async getToday(@Query() filter: ScheduleFilterDto): Promise<ClassResponseDto[]> {
        return this.scheduleService.getToday(filter);
    }

    @Get('week')
    @ApiOperation({ summary: 'Get weekly schedule (7 days from today)' })
    @ApiQuery({ name: 'difficultyLevel', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
    @ApiQuery({ name: 'coachId', required: false, type: String })
    @ApiQuery({ name: 'trainingTypeId', required: false, type: String })
    @ApiQuery({
        name: 'impactType',
        required: false,
        type: String,
        description: 'Comma-separated impact types, e.g. cardio,strength',
    })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: 'Weekly schedule', type: WeekScheduleDto })
    async getWeek(@Query() filter: ScheduleFilterDto): Promise<WeekScheduleDto> {
        return this.scheduleService.getWeek(filter);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single schedule entry by id or date' })
    @ApiParam({
        name: 'id',
        description: 'Schedule entry UUID or date in YYYY-MM-DD format',
        example: '2026-02-22',
    })
    @ApiQuery({ name: 'difficultyLevel', required: false, enum: ['beginner', 'intermediate', 'advanced'] })
    @ApiQuery({ name: 'coachId', required: false, type: String })
    @ApiQuery({ name: 'trainingTypeId', required: false, type: String })
    @ApiQuery({
        name: 'impactType',
        required: false,
        type: String,
        description: 'Comma-separated impact types',
    })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: 'Schedule entry or list for date', type: ClassResponseDto })
    @ApiResponse({ status: 404, description: 'Not found' })
    async getByIdOrDate(
        @Param('id') id: string,
        @Query() filter: ScheduleFilterDto,
    ): Promise<ClassResponseDto | ClassResponseDto[]> {
        // UUID pattern: 8-4-4-4-12 hex chars
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(id)) {
            return this.scheduleService.getById(id);
        }
        // Otherwise treat as a date string YYYY-MM-DD
        return this.scheduleService.getByDate(id, filter);
    }
}
