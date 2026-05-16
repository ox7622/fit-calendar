import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminScheduleService } from './admin-schedule.service';
import { AdminScheduleItemDto, AdminScheduleListResponseDto } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';

@ApiTags('Admin Schedule')
@ApiBearerAuth()
@Controller('admin/schedule')
@UseGuards(AdminAuthGuard)
export class AdminScheduleController {
    constructor(private readonly scheduleService: AdminScheduleService) {}

    @Get()
    @ApiOperation({
        summary: 'List schedule entries (paginated, filterable)',
        description:
            'Defaults: range = start of current Russian-week (Monday) → +14 days. ' +
            'Use status="all" (default) to include cancelled entries; "scheduled"/"cancelled" filter to one.',
    })
    @ApiResponse({ status: 200, type: AdminScheduleListResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async list(@Query() query: AdminScheduleQueryDto): Promise<AdminScheduleListResponseDto> {
        return this.scheduleService.findAll(query);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new schedule entry' })
    @ApiResponse({ status: 201, type: AdminScheduleItemDto })
    @ApiResponse({ status: 400, description: 'Invalid body or inactive coach/trainingType' })
    @ApiResponse({ status: 401 })
    async create(@Body() dto: CreateScheduleEntryDto): Promise<AdminScheduleItemDto> {
        return this.scheduleService.create(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single schedule entry (for the edit form)' })
    @ApiParam({ name: 'id', description: 'Schedule entry UUID' })
    @ApiResponse({ status: 200, type: AdminScheduleItemDto })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 404 })
    async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminScheduleItemDto> {
        return this.scheduleService.findById(id);
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update a schedule entry',
        description:
            'Status is not editable here — cancellation is its own endpoint (Story 6.4) ' +
            'so the cancellation-notification side-effect runs. If `startTime` changes, ' +
            'pending reminders are recomputed and SCHEDULE_CHANGED_EVENT fires for ' +
            'Story 5.4 listeners.',
    })
    @ApiParam({ name: 'id', description: 'Schedule entry UUID' })
    @ApiResponse({ status: 200, type: AdminScheduleItemDto })
    @ApiResponse({ status: 400 })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 404 })
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateScheduleEntryDto,
    ): Promise<AdminScheduleItemDto> {
        return this.scheduleService.update(id, dto);
    }
}
