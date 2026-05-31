import {
    BadRequestException,
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
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MAX_UPLOAD_BYTES } from '@fitcalendar/shared';

import { UPLOAD_ERRORS } from '../../../common/constants';
import { AdminUser } from '../../../common/decorators/admin-user.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { detectImageFormat } from '../../../common/utils/image-magic-bytes';

import { AdminCoachesService } from './admin-coaches.service';
import { CoachDto, CoachOptionDto } from './dto/coach.dto';
import { CreateCoachDto } from './dto/create-coach.dto';
import { UpdateCoachDto } from './dto/update-coach.dto';

@ApiTags('Admin Coaches')
@ApiBearerAuth()
@Controller('admin/coaches')
@UseGuards(AdminAuthGuard)
export class AdminCoachesController {
    constructor(private readonly coachesService: AdminCoachesService) {}

    @Get()
    @ApiOperation({ summary: 'List all coaches (active + inactive) sorted by name' })
    @ApiResponse({ status: 200, type: [CoachDto] })
    list(): Promise<CoachDto[]> {
        return this.coachesService.findAll();
    }

    /**
     * NOTE: route order matters. `options` MUST be declared before `:id`,
     * otherwise NestJS routes the path as `findById('options')`.
     */
    @Get('options')
    @ApiOperation({ summary: 'Active-only id+name list for dropdowns (Story 6.3 form)' })
    @ApiResponse({ status: 200, type: [CoachOptionDto] })
    options(): Promise<CoachOptionDto[]> {
        return this.coachesService.findOptions();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single coach' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: CoachDto })
    @ApiResponse({ status: 404 })
    findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<CoachDto> {
        return this.coachesService.findById(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a coach' })
    @ApiResponse({ status: 201, type: CoachDto })
    @ApiResponse({ status: 400 })
    create(@Body() dto: CreateCoachDto): Promise<CoachDto> {
        return this.coachesService.create(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a coach (also used for soft-delete via isActive=false)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 200, type: CoachDto })
    @ApiResponse({ status: 404 })
    update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateCoachDto): Promise<CoachDto> {
        return this.coachesService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Hard-delete a coach (only if zero schedule entries)',
        description: 'For everyday departures use the isActive=false soft delete instead.',
    })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'Coach has schedule entries — use deactivation' })
    async deleteCoach(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') adminUserId: string,
        @Ip() ipAddress: string,
    ): Promise<void> {
        await this.coachesService.deleteCoach(id, { adminUserId, ipAddress });
    }

    @Post(':id/photo')
    @ApiOperation({ summary: 'Upload + replace the coach photo (Cloudinary, face-aware 400×400)' })
    @ApiConsumes('multipart/form-data')
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 201, schema: { properties: { photoUrl: { type: 'string' } } } })
    @ApiResponse({ status: 400, description: 'Missing/invalid file or non-image MIME' })
    @ApiResponse({ status: 413, description: 'File exceeds 5 MB' })
    @ApiResponse({ status: 503, description: 'Cloudinary not configured' })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
    async uploadPhoto(
        @Param('id', new ParseUUIDPipe()) id: string,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<{ photoUrl: string }> {
        if (!file) {
            throw new BadRequestException(UPLOAD_ERRORS.FILE_REQUIRED);
        }
        // MIME is client-set and trivially spoofable; magic-byte sniffing
        // catches a renamed .html posted as image/jpeg.
        if (!detectImageFormat(file.buffer)) {
            throw new BadRequestException(UPLOAD_ERRORS.UNSUPPORTED_IMAGE_TYPE);
        }
        return this.coachesService.setPhoto(id, file.buffer);
    }
}
