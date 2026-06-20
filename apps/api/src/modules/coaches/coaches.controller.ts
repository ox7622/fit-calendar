import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ClassResponseDto } from '../schedule/dto/schedule-response.dto';

import { CoachesService } from './coaches.service';
import { CoachDetailDto } from './dto/coach-detail.dto';
import { CoachSummaryDto } from './dto/coach-summary.dto';

@ApiTags('Coaches')
@Controller('coaches')
export class CoachesController {
    constructor(private readonly coachesService: CoachesService) {}

    @Get()
    @ApiOperation({ summary: 'Get list of active coaches' })
    @ApiResponse({ status: 200, description: 'List of active coaches', type: [CoachSummaryDto] })
    async findAll(): Promise<CoachSummaryDto[]> {
        return this.coachesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get coach by id' })
    @ApiParam({ name: 'id', description: 'Coach UUID' })
    @ApiResponse({ status: 200, description: 'Coach detail', type: CoachDetailDto })
    @ApiResponse({ status: 404, description: 'Coach not found' })
    async findById(@Param('id') id: string): Promise<CoachDetailDto> {
        return this.coachesService.findById(id);
    }

    @Get(':id/schedule')
    @ApiOperation({ summary: 'Get upcoming schedule for a coach (next 7 days)' })
    @ApiParam({ name: 'id', description: 'Coach UUID' })
    @ApiResponse({ status: 200, description: 'Coach upcoming schedule', type: [ClassResponseDto] })
    @ApiResponse({ status: 404, description: 'Coach not found' })
    async getSchedule(@Param('id') id: string): Promise<ClassResponseDto[]> {
        return this.coachesService.getCoachSchedule(id);
    }
}
