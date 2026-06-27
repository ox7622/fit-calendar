import { ClubInfo, TWorkingHours } from '@fitcalendar/db';
import { DEFAULT_TIME_ZONE } from '@fitcalendar/shared';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CloudinaryService } from '../uploads/cloudinary.service';

import { AdminClubInfoDto, toAdminClubInfoDto } from './dto/club-info.dto';
import { UpdateClubInfoDto } from './dto/update-club-info.dto';

const DEFAULT_HOURS: TWorkingHours = {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '10:00', close: '20:00' },
    sunday: null,
};

@Injectable()
export class AdminClubService {
    private readonly logger = new Logger(AdminClubService.name);

    constructor(
        @InjectRepository(ClubInfo)
        private readonly clubRepo: Repository<ClubInfo>,
        private readonly cloudinary: CloudinaryService,
    ) {}

    /** Story 6.7 — ClubInfo is a singleton; auto-create on first read. */
    async get(): Promise<AdminClubInfoDto> {
        return toAdminClubInfoDto(await this.loadSingleton());
    }

    async update(dto: UpdateClubInfoDto): Promise<AdminClubInfoDto> {
        const club = await this.loadSingleton();

        club.name = dto.name;
        club.address = dto.address;
        club.phone = dto.phone ?? null;
        club.workingHours = dto.workingHours;
        club.mapUrl = dto.mapUrl ?? null;
        club.timezone = dto.timezone;

        const saved = await this.clubRepo.save(club);
        return toAdminClubInfoDto(saved);
    }

    async setLogo(buffer: Buffer): Promise<{ logoUrl: string }> {
        const club = await this.loadSingleton();
        const logoUrl = await this.cloudinary.uploadClubLogo(buffer);
        club.logoUrl = logoUrl;
        await this.clubRepo.save(club);
        return { logoUrl };
    }

    private async loadSingleton(): Promise<ClubInfo> {
        const existing = await this.clubRepo.findOne({ where: {} });
        if (existing) return existing;

        const created = await this.clubRepo.save(
            this.clubRepo.create({
                name: 'Fit Calendar Club',
                address: '',
                phone: null,
                workingHours: DEFAULT_HOURS,
                mapUrl: null,
                logoUrl: null,
                timezone: DEFAULT_TIME_ZONE,
            }),
        );
        this.logger.log(`Auto-created singleton ClubInfo ${created.id}`);
        return created;
    }
}
