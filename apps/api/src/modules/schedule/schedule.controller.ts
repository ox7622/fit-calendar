import { Controller, Get, Param, ParseBoolPipe, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TelegramAuthGuard } from '../../common/guards/telegram-auth.guard';

import { ClassResponseDto } from './dto/schedule-response.dto';
import { WeekScheduleDto } from './dto/week-schedule.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('Schedule')
@Controller('schedule')
@UseGuards(TelegramAuthGuard)
@ApiHeader({
    name: 'X-Telegram-Init-Data',
    description: 'Telegram Mini App initData for authentication',
    required: true,
})
export class ScheduleController {
    constructor(private readonly scheduleService: ScheduleService) {}

    @Get('today')
    @ApiOperation({ summary: "Get today's schedule" })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: "Today's schedule", type: [ClassResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getToday(
        @Query('includeCancelled', new ParseBoolPipe({ optional: true }))
        includeCancelled?: boolean,
    ): Promise<ClassResponseDto[]> {
        return this.scheduleService.getToday(includeCancelled ?? false);
    }

    @Get('week')
    @ApiOperation({ summary: 'Get weekly schedule (7 days from today)' })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: 'Weekly schedule', type: WeekScheduleDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getWeek(
        @Query('includeCancelled', new ParseBoolPipe({ optional: true }))
        includeCancelled?: boolean,
    ): Promise<WeekScheduleDto> {
        return this.scheduleService.getWeek(includeCancelled ?? false);
    }

    @Get(':date')
    @ApiOperation({ summary: 'Get schedule for a specific date' })
    @ApiParam({ name: 'date', description: 'Date in YYYY-MM-DD format', example: '2026-02-22' })
    @ApiQuery({
        name: 'includeCancelled',
        required: false,
        type: Boolean,
        description: 'Include cancelled classes (default: false)',
    })
    @ApiResponse({ status: 200, description: 'Schedule for the given date', type: [ClassResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getByDate(
        @Param('date') date: string,
        @Query('includeCancelled', new ParseBoolPipe({ optional: true }))
        includeCancelled?: boolean,
    ): Promise<ClassResponseDto[]> {
        return this.scheduleService.getByDate(date, includeCancelled ?? false);
    }
}
