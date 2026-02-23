import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { TelegramAuthGuard } from '../../common/guards/telegram-auth.guard';

import { CoachesService } from './coaches.service';
import { CoachSummaryDto } from './dto/coach-summary.dto';

@ApiTags('Coaches')
@Controller('coaches')
@UseGuards(TelegramAuthGuard)
@ApiHeader({
    name: 'X-Telegram-Init-Data',
    description: 'Telegram Mini App initData for authentication',
    required: true,
})
export class CoachesController {
    constructor(private readonly coachesService: CoachesService) {}

    @Get()
    @ApiOperation({ summary: 'Get list of active coaches' })
    @ApiResponse({ status: 200, description: 'List of active coaches', type: [CoachSummaryDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findAll(): Promise<CoachSummaryDto[]> {
        return this.coachesService.findAll();
    }
}
