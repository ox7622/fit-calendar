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
     *
     * Cached for a short TTL: the value changes only on rare admin edits, but this
     * is hit on every schedule request and bot command (a single command can call
     * it more than once). The TTL keeps reads cheap while still picking up an admin
     * change within seconds — no restart needed.
     */
    async getTimeZone(): Promise<string> {
        const now = Date.now();
        if (this.tzCache && this.tzCache.expiresAt > now) return this.tzCache.value;

        const record = await this.clubInfoRepository.findOne({ where: {} });
        const value = record?.timezone ?? DEFAULT_TIME_ZONE;
        this.tzCache = { value, expiresAt: now + ClubService.TZ_CACHE_TTL_MS };
        return value;
    }

    private tzCache: { value: string; expiresAt: number } | null = null;
    private static readonly TZ_CACHE_TTL_MS = 60_000;
}
