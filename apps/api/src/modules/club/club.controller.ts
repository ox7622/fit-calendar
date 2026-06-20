import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ClubService } from './club.service';
import { ClubInfoDto } from './dto/club-info.dto';

@ApiTags('Club')
@Controller('club-info')
export class ClubController {
    constructor(private readonly clubService: ClubService) {}

    @Get()
    @ApiOperation({ summary: 'Get club information' })
    @ApiResponse({ status: 200, description: 'Club information', type: ClubInfoDto })
    async getInfo(): Promise<ClubInfoDto> {
        return this.clubService.getInfo();
    }
}
