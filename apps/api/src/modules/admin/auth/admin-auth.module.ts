import { AdminInviteToken, AdminUser } from '@fitcalendar/db';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([AdminUser, AdminInviteToken]),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: { expiresIn: '24h' },
            }),
        }),
    ],
    controllers: [AdminAuthController],
    providers: [AdminAuthService, AdminAuthGuard],
    exports: [AdminAuthService, AdminAuthGuard, JwtModule],
})
export class AdminAuthModule {}
