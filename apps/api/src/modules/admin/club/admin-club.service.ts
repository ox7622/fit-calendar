import { ClubInfo, TWorkingHours } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

    /**
     * Story 6.7 — ClubInfo is a singleton. We auto-create a minimal default if
     * the table is empty so a fresh deployment doesn't require a manual seed.
     */
    async getOrCreate(): Promise<AdminClubInfoDto> {
        const existing = await this.clubRepo.findOne({ where: {} });
        if (existing) return toAdminClubInfoDto(existing);

        const created = this.clubRepo.create({
            name: 'Fit Calendar Club',
            address: '',
            phone: null,
            workingHours: DEFAULT_HOURS,
            latitude: null,
            longitude: null,
            logoUrl: null,
        });
        const saved = await this.clubRepo.save(created);
        this.logger.log(`Auto-created singleton ClubInfo ${saved.id}`);
        return toAdminClubInfoDto(saved);
    }

    async update(dto: UpdateClubInfoDto): Promise<AdminClubInfoDto> {
        const club = await this.loadSingleton();

        const latProvided = dto.latitude !== undefined && dto.latitude !== null;
        const lonProvided = dto.longitude !== undefined && dto.longitude !== null;
        if (latProvided !== lonProvided) {
            throw new BadRequestException('Latitude и longitude должны быть указаны вместе (либо оба, либо ни одного)');
        }

        club.name = dto.name;
        club.address = dto.address;
        club.phone = dto.phone ?? null;
        club.workingHours = dto.workingHours;
        club.latitude = dto.latitude ?? null;
        club.longitude = dto.longitude ?? null;

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

    /**
     * Re-uses the auto-create path so callers don't need to handle the
     * empty-table case. By the time we reach update/setLogo, getOrCreate may
     * not have been called yet (no GET before PUT).
     */
    private async loadSingleton(): Promise<ClubInfo> {
        const existing = await this.clubRepo.findOne({ where: {} });
        if (existing) return existing;
        const created = this.clubRepo.create({
            name: 'Fit Calendar Club',
            address: '',
            phone: null,
            workingHours: DEFAULT_HOURS,
            latitude: null,
            longitude: null,
            logoUrl: null,
        });
        return this.clubRepo.save(created);
    }
}
