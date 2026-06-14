import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { CreateDurationOptionDto, DurationOptionDto, UpdateDurationOptionDto } from './dto/duration-option.dto';
import { MoveTaxonomyDto } from './dto/move-taxonomy.dto';
import { DurationOptionsService } from './duration-options.service';

@ApiTags('Admin Duration Options')
@ApiBearerAuth()
@Controller('admin/duration-options')
@UseGuards(AdminAuthGuard)
export class DurationOptionsController {
    constructor(private readonly service: DurationOptionsService) {}

    @Get()
    @ApiOperation({ summary: 'List all (incl. inactive), ordered by sortOrder' })
    @ApiResponse({ status: 200, type: [DurationOptionDto] })
    list(): Promise<DurationOptionDto[]> {
        return this.service.findAll();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add a duration option' })
    @ApiResponse({ status: 201, type: DurationOptionDto })
    @ApiResponse({ status: 409, description: 'Duplicate value' })
    create(@Body() dto: CreateDurationOptionDto): Promise<DurationOptionDto> {
        return this.service.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update value / isActive' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: DurationOptionDto })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'Duplicate value' })
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateDurationOptionDto,
    ): Promise<DurationOptionDto> {
        return this.service.update(id, dto);
    }

    @Put(':id/move')
    @ApiOperation({ summary: 'Reorder one step up/down (swaps with neighbour)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: [DurationOptionDto] })
    @ApiResponse({ status: 404 })
    move(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: MoveTaxonomyDto): Promise<DurationOptionDto[]> {
        return this.service.move(id, dto.direction);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Hard-delete (existing classes keep their stored durationMinutes)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404 })
    async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
