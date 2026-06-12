import { ImpactType, TrainingType } from '@fitcalendar/db';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminAuditService } from '../audit';

import { TaxonomyCrudService } from './taxonomy-crud.service';

@Injectable()
export class ImpactTypesService extends TaxonomyCrudService<ImpactType> {
    constructor(
        @InjectRepository(ImpactType) repo: Repository<ImpactType>,
        @InjectRepository(TrainingType) private readonly typeRepo: Repository<TrainingType>,
        auditService: AdminAuditService,
    ) {
        super(repo, auditService, {
            resourceType: 'impact_type',
            deleteAuditAction: 'delete_impact_type',
            inUseNoun: 'тип нагрузки',
        });
    }

    /** impactTypes is a text[] of keys — count rows where the array contains the key. */
    protected countReferences(key: string): Promise<number> {
        return this.typeRepo.createQueryBuilder('t').where(':key = ANY(t.impactTypes)', { key }).getCount();
    }
}
