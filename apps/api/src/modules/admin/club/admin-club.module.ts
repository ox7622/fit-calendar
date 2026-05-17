import { ClubInfo } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../auth';
import { UploadsModule } from '../uploads';

import { AdminClubController } from './admin-club.controller';
import { AdminClubService } from './admin-club.service';

@Module({
    imports: [TypeOrmModule.forFeature([ClubInfo]), AdminAuthModule, UploadsModule],
    controllers: [AdminClubController],
    providers: [AdminClubService],
    exports: [AdminClubService],
})
export class AdminClubModule {}
