import { Body, Delete, Get, HttpCode, HttpStatus, Ip, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { AdminUser } from '../../../common/decorators/admin-user.decorator';

import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { MoveTaxonomyDto } from './dto/move-taxonomy.dto';
import { TaxonomyItemDto } from './dto/taxonomy-item.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import type { ITaxonomyService } from './taxonomy-crud.service';

/**
 * Shared CRUD routes for the taxonomy resources. Concrete subclasses supply the
 * `@Controller(path)` + guard and the bound service; NestJS registers these
 * decorated handlers under each subclass's path.
 */
export abstract class TaxonomyControllerBase {
    protected abstract readonly service: ITaxonomyService;

    @Get()
    @ApiOperation({ summary: 'List all (incl. inactive), ordered by sortOrder' })
    @ApiResponse({ status: 200, type: [TaxonomyItemDto] })
    list(): Promise<TaxonomyItemDto[]> {
        return this.service.findAll();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create (key auto-derived from label)' })
    @ApiResponse({ status: 201, type: TaxonomyItemDto })
    @ApiResponse({ status: 400, description: 'Invalid label or colour' })
    create(@Body() dto: CreateTaxonomyDto): Promise<TaxonomyItemDto> {
        return this.service.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update label / colour / isActive (key is immutable)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: TaxonomyItemDto })
    @ApiResponse({ status: 404 })
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateTaxonomyDto): Promise<TaxonomyItemDto> {
        return this.service.update(id, dto);
    }

    @Put(':id/move')
    @ApiOperation({ summary: 'Reorder one step up/down (swaps with neighbour)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: [TaxonomyItemDto] })
    @ApiResponse({ status: 404 })
    move(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: MoveTaxonomyDto): Promise<TaxonomyItemDto[]> {
        return this.service.move(id, dto.direction);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Hard-delete (409 if referenced by any training type)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'In use — reassign first' })
    async deleteItem(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.service.deleteItem(id, { adminUserId, ipAddress });
    }
}
