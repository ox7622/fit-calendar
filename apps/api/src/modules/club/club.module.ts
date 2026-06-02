import { ClubInfo } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ClubController } from './club.controller';
import { ClubService } from './club.service';

@Module({
    imports: [TypeOrmModule.forFeature([ClubInfo])],
    controllers: [ClubController],
    providers: [ClubService],
    exports: [ClubService],
})
export class ClubModule {}
