import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminScheduleService } from './admin-schedule.service';
import { AdminScheduleListResponseDto } from './dto/admin-schedule-list.dto';
import { AdminScheduleQueryDto } from './dto/admin-schedule-query.dto';

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
}
