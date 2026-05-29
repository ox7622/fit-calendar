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
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminUser } from '../../common/decorators/admin-user.decorator';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

import { CreatePlanDto } from './dto/create-plan.dto';
import { AdminPlanResponseDto, PlanOptionDto } from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { MembershipPlansService } from './membership-plans.service';

@ApiTags('Admin Membership Plans')
@ApiBearerAuth()
@Controller('admin/membership-plans')
@UseGuards(AdminAuthGuard)
export class AdminMembershipPlansController {
    constructor(private readonly plansService: MembershipPlansService) {}

    @Get()
    @ApiOperation({ summary: 'List all plans (active + inactive)' })
    @ApiResponse({ status: 200, type: [AdminPlanResponseDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findAll(): Promise<AdminPlanResponseDto[]> {
        return this.plansService.findAllAdmin();
    }

    // Declared before `:id` so the literal route does not get shadowed by the param route.
    @Get('options')
    @ApiOperation({ summary: 'Get active plans as compact dropdown options' })
    @ApiResponse({ status: 200, type: [PlanOptionDto] })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findOptions(): Promise<PlanOptionDto[]> {
        return this.plansService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get plan by id' })
    @ApiParam({ name: 'id', description: 'Plan UUID' })
    @ApiResponse({ status: 200, type: AdminPlanResponseDto })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminPlanResponseDto> {
        return this.plansService.findById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new plan' })
    @ApiResponse({ status: 201, type: AdminPlanResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid body' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async create(@Body() dto: CreatePlanDto): Promise<AdminPlanResponseDto> {
        return this.plansService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an existing plan (does NOT affect existing memberships)' })
    @ApiParam({ name: 'id', description: 'Plan UUID' })
    @ApiResponse({ status: 200, type: AdminPlanResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid body' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdatePlanDto,
    ): Promise<AdminPlanResponseDto> {
        return this.plansService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a plan (only if no memberships reference it)' })
    @ApiParam({ name: 'id', description: 'Plan UUID' })
    @ApiResponse({ status: 204, description: 'Plan deleted' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Plan not found' })
    @ApiResponse({ status: 409, description: 'Plan has memberships — deactivate instead' })
    async deletePlan(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.plansService.deletePlan(id, { adminUserId, ipAddress });
    }
}
