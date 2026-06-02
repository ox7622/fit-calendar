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

import { AdminUser } from '../../../common/decorators/admin-user.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminTrainingTypesService } from './admin-training-types.service';
import { CreateTrainingTypeDto } from './dto/create-training-type.dto';
import { TrainingTypeDto, TrainingTypeOptionDto } from './dto/training-type.dto';
import { UpdateTrainingTypeDto } from './dto/update-training-type.dto';

@ApiTags('Admin Training Types')
@ApiBearerAuth()
@Controller('admin/training-types')
@UseGuards(AdminAuthGuard)
export class AdminTrainingTypesController {
    constructor(private readonly typesService: AdminTrainingTypesService) {}

    @Get()
    @ApiOperation({ summary: 'List all training types (active + inactive) sorted by name' })
    @ApiResponse({ status: 200, type: [TrainingTypeDto] })
    list(): Promise<TrainingTypeDto[]> {
        return this.typesService.findAll();
    }

    /** Route order: 'options' MUST come before ':id'. */
    @Get('options')
    @ApiOperation({ summary: 'Active-only id+name list for dropdowns (Story 6.3 form)' })
    @ApiResponse({ status: 200, type: [TrainingTypeOptionDto] })
    options(): Promise<TrainingTypeOptionDto[]> {
        return this.typesService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single training type' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: TrainingTypeDto })
    @ApiResponse({ status: 404 })
    findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<TrainingTypeDto> {
        return this.typesService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a training type' })
    @ApiResponse({ status: 201, type: TrainingTypeDto })
    @ApiResponse({ status: 400 })
    create(@Body() dto: CreateTrainingTypeDto): Promise<TrainingTypeDto> {
        return this.typesService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a training type (also used for soft-delete via isActive=false)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: TrainingTypeDto })
    @ApiResponse({ status: 404 })
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTrainingTypeDto): Promise<TrainingTypeDto> {
        return this.typesService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Hard-delete a training type (only if zero schedule entries)',
        description: 'For everyday removal use the isActive=false soft delete instead.',
    })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'Type has schedule entries — use deactivation' })
    async deleteType(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.typesService.deleteType(id, { adminUserId, ipAddress });
    }
}
