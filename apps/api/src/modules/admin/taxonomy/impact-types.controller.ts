import { Controller, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { ImpactTypesService } from './impact-types.service';
import { TaxonomyControllerBase } from './taxonomy.controller.base';

@ApiTags('Admin Impact Types')
@ApiBearerAuth()
@Controller('admin/impact-types')
@UseGuards(AdminAuthGuard)
export class ImpactTypesController extends TaxonomyControllerBase {
    constructor(protected readonly service: ImpactTypesService) {
        super();
    }
}
