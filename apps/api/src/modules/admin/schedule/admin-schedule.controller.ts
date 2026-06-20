import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Ip,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminUser } from '../../../common/decorators/admin-user.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminScheduleService } from './admin-schedule.service';
import { AdminScheduleItemDto, AdminScheduleListResponseDto } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';
import { BulkCreateResponseDto, BulkCreateScheduleDto } from './dto/bulk-create-schedule.dto';
import { BulkDeleteResponseDto, BulkDeleteScheduleDto } from './dto/bulk-delete-schedule.dto';
import { CancelClassDto } from './dto/cancel-class.dto';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { DeleteScheduleEntryQueryDto } from './dto/delete-schedule-entry-query.dto';
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

    @Post('bulk')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Bulk-create schedule entries (copy week / copy class / recurrence)',
        description:
            'Inserts 1..200 independent entries in a single transaction. Duplicates are NOT ' +
            'checked. Fails atomically (nothing created) if any referenced coach or training ' +
            'type is inactive.',
    })
    @ApiResponse({ status: 201, type: BulkCreateResponseDto })
    @ApiResponse({ status: 400, description: 'Empty/oversized array or inactive coach/trainingType' })
    @ApiResponse({ status: 401 })
    async bulkCreate(@Body() dto: BulkCreateScheduleDto): Promise<BulkCreateResponseDto> {
        return this.scheduleService.bulkCreate(dto);
    }

    @Post('bulk-delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Bulk hard-delete schedule entries (e.g. wipe a duplicated calendar)',
        description:
            'Deletes 1..200 entries by id. Partial success: entries that have subscribers (any ' +
            'reminder) are skipped — they must be cancelled, not deleted — and reported in ' +
            '`skipped`, alongside any ids that no longer exist. Returns the removed ids and the ' +
            'skip report. Past or future does not matter; only subscriber presence gates deletion.',
    })
    @ApiResponse({ status: 200, type: BulkDeleteResponseDto })
    @ApiResponse({ status: 400, description: 'Empty/oversized array or non-UUID id' })
    @ApiResponse({ status: 401 })
    async bulkDelete(
        @Body() dto: BulkDeleteScheduleDto,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<BulkDeleteResponseDto> {
        return this.scheduleService.bulkDelete(dto.ids, { adminUserId, ipAddress });
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

    @Post(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Cancel a class (soft, idempotent)',
        description:
            'Flips status to cancelled, persists the optional reason, deletes pending reminders, ' +
            'and emits SCHEDULE_CANCELLED_EVENT for Story 5.5 listeners. Re-cancelling a cancelled ' +
            'class returns 200 with the existing record (no event re-emit).',
    })
    @ApiParam({ name: 'id', description: 'Schedule entry UUID' })
    @ApiResponse({ status: 200, type: AdminScheduleItemDto })
    @ApiResponse({ status: 400, description: 'Reason exceeds 500 chars' })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 404 })
    async cancel(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: CancelClassDto,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<AdminScheduleItemDto> {
        return this.scheduleService.cancel(id, dto.reason ?? null, { adminUserId, ipAddress }, dto.notify ?? true);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Hard-delete a schedule entry (past classes with no reminders only)',
        description:
            'Allowed only when the class is in the past AND has zero reminders (sent, pending, ' +
            'or failed — they are audit trail). Future classes or classes with any reminder history ' +
            'return 409; admin should cancel instead.',
    })
    @ApiParam({ name: 'id', description: 'Schedule entry UUID' })
    @ApiResponse({ status: 204, description: 'Deleted' })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'Class has reminders or is still in the future' })
    async deleteEntry(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Query() query: DeleteScheduleEntryQueryDto,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.scheduleService.deleteEntry(id, { adminUserId, ipAddress }, query.notify ?? true);
    }
}
