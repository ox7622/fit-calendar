import { ClubInfo } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';
import { UploadsModule } from '../uploads';

import { AdminClubController } from './admin-club.controller';
import { AdminClubService } from './admin-club.service';
import { GeocodingService } from './geocoding.service';

@Module({
    imports: [TypeOrmModule.forFeature([ClubInfo]), AdminAuthModule, UploadsModule],
    controllers: [AdminClubController],
    providers: [AdminClubService, GeocodingService],
    exports: [AdminClubService],
})
export class AdminClubModule {}
