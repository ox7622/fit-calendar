import { ClubInfo } from '@fitcalendar/db';
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClubInfoDto } from './dto/club-info.dto';

const DEFAULT_STUB: ClubInfoDto = {
    id: 'default',
    name: 'FitCalendar Club',
    address: 'ул. Примерная, 1, Москва',
    phone: null,
    workingHours: {
        Mon: { open: '09:00', close: '21:00' },
        Tue: { open: '09:00', close: '21:00' },
        Wed: { open: '09:00', close: '21:00' },
        Thu: { open: '09:00', close: '21:00' },
        Fri: { open: '09:00', close: '21:00' },
        Sat: { open: '10:00', close: '18:00' },
        Sun: null,
    },
    mapUrl: null,
    logoUrl: null,
    timezone: DEFAULT_TIME_ZONE,
};

@Injectable()
export class ClubService {
    private readonly logger = new Logger(ClubService.name);

    constructor(
        @InjectRepository(ClubInfo)
        private readonly clubInfoRepository: Repository<ClubInfo>,
    ) {}

    async getInfo(): Promise<ClubInfoDto> {
        this.logger.log('Fetching club info');
        const record = await this.clubInfoRepository.findOne({ where: {} });

        if (!record) {
            this.logger.warn('No club info record found, returning default stub');
            return DEFAULT_STUB;
        }

        return {
            id: record.id,
            name: record.name,
            address: record.address,
            phone: record.phone,
            workingHours: record.workingHours,
            mapUrl: record.mapUrl,
            logoUrl: record.logoUrl,
            timezone: record.timezone,
        };
    }

    /**
     * The club's IANA timezone — the single source of truth for rendering class
     * times (bot, push, schedule bucketing). Falls back to the app default when
     * no club record exists yet.
     */
    async getTimeZone(): Promise<string> {
        const record = await this.clubInfoRepository.findOne({ where: {} });
        return record?.timezone ?? DEFAULT_TIME_ZONE;
    }
}
