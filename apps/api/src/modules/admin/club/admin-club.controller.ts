import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Put,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';
import { detectImageFormat } from '../../../common/utils/image-magic-bytes';

import { AdminClubService } from './admin-club.service';
import { AdminClubInfoDto } from './dto/club-info.dto';
import { UpdateClubInfoDto } from './dto/update-club-info.dto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

@ApiTags('Admin Club')
@ApiBearerAuth()
@Controller('admin/club-info')
@UseGuards(AdminAuthGuard)
export class AdminClubController {
    constructor(private readonly clubService: AdminClubService) {}

    @Get()
    @ApiOperation({
        summary: 'Get the singleton ClubInfo record (auto-creates on first call)',
    })
    @ApiResponse({ status: 200, type: AdminClubInfoDto })
    get(): Promise<AdminClubInfoDto> {
        return this.clubService.getOrCreate();
    }

    @Put()
    @ApiOperation({ summary: 'Update club info (name, address, phone, hours, lat/lon)' })
    @ApiResponse({ status: 200, type: AdminClubInfoDto })
    @ApiResponse({ status: 400, description: 'Validation failure (e.g. lat without lon)' })
    update(@Body() dto: UpdateClubInfoDto): Promise<AdminClubInfoDto> {
        return this.clubService.update(dto);
    }

    @Post('logo')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Upload + replace the club logo (Cloudinary, 200×200 fit)' })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, schema: { properties: { logoUrl: { type: 'string' } } } })
    @ApiResponse({ status: 400, description: 'Missing/invalid file or non-image MIME' })
    @ApiResponse({ status: 413, description: 'File exceeds 5 MB' })
    @ApiResponse({ status: 503, description: 'Cloudinary not configured' })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_LOGO_BYTES } }))
    async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<{ logoUrl: string }> {
        if (!file) throw new BadRequestException('Файл не загружен');
        // Magic-byte sniff — see common/utils/image-magic-bytes.ts.
        if (!detectImageFormat(file.buffer)) {
            throw new BadRequestException('Поддерживаются только изображения JPEG / PNG / WebP / GIF');
        }
        return this.clubService.setLogo(file.buffer);
    }
}
