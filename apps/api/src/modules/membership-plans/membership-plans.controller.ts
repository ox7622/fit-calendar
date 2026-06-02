import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { PlanResponseDto } from './dto/plan-response.dto';
import { MembershipPlansService } from './membership-plans.service';

@ApiTags('Membership Plans')
@Controller('membership-plans')
export class MembershipPlansController {
    constructor(private readonly plansService: MembershipPlansService) {}

    @Get()
    @ApiOperation({ summary: 'Get list of active membership plans (public — no auth)' })
    @ApiResponse({ status: 200, description: 'List of active plans', type: [PlanResponseDto] })
    async findAll(): Promise<PlanResponseDto[]> {
        return this.plansService.findAllActive();
    }
}
