import { Customer, Reminder } from '@fitcalendar/db';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../admin/auth';

import { AdminCustomerController } from './admin-customer.controller';
import { CustomerService } from './customer.service';
import { MeController } from './me.controller';

/**
 * Marked @Global so `TelegramAuthGuard` (which is used by many feature
 * modules — coaches, schedule, club, etc.) can inject `CustomerService`
 * without each module having to import CustomerModule explicitly.
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Customer, Reminder]), AdminAuthModule],
    controllers: [MeController, AdminCustomerController],
    providers: [CustomerService],
    exports: [CustomerService],
})
export class CustomerModule {}
