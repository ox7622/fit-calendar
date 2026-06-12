import { DifficultyLevel, TrainingType } from '@fitcalendar/db';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminAuditService } from '../audit';

import { TaxonomyCrudService } from './taxonomy-crud.service';

@Injectable()
export class DifficultyLevelsService extends TaxonomyCrudService<DifficultyLevel> {
    constructor(
        @InjectRepository(DifficultyLevel) repo: Repository<DifficultyLevel>,
        @InjectRepository(TrainingType) private readonly typeRepo: Repository<TrainingType>,
        auditService: AdminAuditService,
    ) {
        super(repo, auditService, {
            resourceType: 'difficulty_level',
            deleteAuditAction: 'delete_difficulty_level',
            inUseNoun: 'уровень',
        });
    }

    protected countReferences(key: string): Promise<number> {
        return this.typeRepo.count({ where: { difficulty: key } });
    }
}
