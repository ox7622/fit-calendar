import { Customer, CustomerMembership, Reminder } from '@fitcalendar/db';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthModule } from '../admin/auth';
import { BotSubscriberModule } from '../bot-subscriber/bot-subscriber.module';

import { AdminCustomerController } from './admin-customer.controller';
import { CustomerImportService } from './customer-import.service';
import { CustomerService } from './customer.service';
import { MeController } from './me.controller';

/**
 * Marked @Global so `TelegramAuthGuard` (which is used by many feature
 * modules — coaches, schedule, club, etc.) can inject `CustomerService`
 * without each module having to import CustomerModule explicitly.
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Customer, Reminder, CustomerMembership]), AdminAuthModule, BotSubscriberModule],
    controllers: [MeController, AdminCustomerController],
    providers: [CustomerService, CustomerImportService],
    exports: [CustomerService],
})
export class CustomerModule {}
