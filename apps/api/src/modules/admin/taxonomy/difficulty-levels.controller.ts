import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { DifficultyLevelsService } from './difficulty-levels.service';
import { TaxonomyControllerBase } from './taxonomy.controller.base';

@ApiTags('Admin Difficulty Levels')
@ApiBearerAuth()
@Controller('admin/difficulty-levels')
@UseGuards(AdminAuthGuard)
export class DifficultyLevelsController extends TaxonomyControllerBase {
    constructor(protected readonly service: DifficultyLevelsService) {
        super();
    }
}
