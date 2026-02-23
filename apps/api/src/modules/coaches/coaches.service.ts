import { Coach } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CoachSummaryDto } from './dto/coach-summary.dto';

@Injectable()
export class CoachesService {
    private readonly logger = new Logger(CoachesService.name);

    constructor(
        @InjectRepository(Coach)
        private readonly coachRepository: Repository<Coach>,
    ) {}

    async findAll(): Promise<CoachSummaryDto[]> {
        this.logger.log('Fetching all active coaches');
        const coaches = await this.coachRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });

        return coaches.map((coach) => ({
            id: coach.id,
            name: coach.name,
            photoUrl: coach.photoUrl,
        }));
    }
}
