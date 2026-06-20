import type { Customer as CustomerEntity } from '@fitcalendar/db';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Customer as CustomerDecorator } from '../../common/decorators/customer.decorator';
import { RequiresLinkedCustomer } from '../../common/guards/requires-linked-customer.guard';
import { TelegramAuthGuard } from '../../common/guards/telegram-auth.guard';

import { CreateReminderDto } from './dto/create-reminder.dto';
import { ReminderListItemDto } from './dto/reminder-list-item.dto';
import { ReminderResponseDto } from './dto/reminder-response.dto';
import { ReminderService } from './reminder.service';

@ApiTags('Reminders')
@Controller('reminders')
@UseGuards(TelegramAuthGuard, RequiresLinkedCustomer)
@ApiHeader({
    name: 'X-Telegram-Init-Data',
    description: 'Telegram Mini App initData for authentication',
    required: true,
})
export class ReminderController {
    constructor(private readonly reminderService: ReminderService) {}

    @Get()
    @ApiOperation({
        summary: 'List the calling customer’s active reminder subscriptions',
        description:
            'Excludes reminders whose class is already in the past. Sorted by class startTime ASC (soonest first).',
    })
    @ApiResponse({ status: 200, type: [ReminderListItemDto] })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 403, description: 'Customer not linked (code: CUSTOMER_NOT_LINKED)' })
    async list(@CustomerDecorator() customer: CustomerEntity): Promise<ReminderListItemDto[]> {
        return this.reminderService.findActiveByCustomer(customer.id);
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Subscribe to a reminder for a class',
        description:
            'Idempotent — re-subscribing returns 200 with the existing reminder. ' +
            "Computes notifyAt from the customer's reminderMinutes setting.",
    })
    @ApiResponse({ status: 200, type: ReminderResponseDto })
    @ApiResponse({ status: 400, description: 'Class is cancelled or has already started' })
    @ApiResponse({ status: 401, description: 'Missing or invalid Telegram initData' })
    @ApiResponse({ status: 403, description: 'Customer not linked (code: CUSTOMER_NOT_LINKED)' })
    @ApiResponse({ status: 404, description: 'Schedule entry not found' })
    async subscribe(
        @CustomerDecorator() customer: CustomerEntity,
        @Body() dto: CreateReminderDto,
    ): Promise<ReminderResponseDto> {
        return this.reminderService.subscribe(
            { customerId: customer.id, reminderMinutes: customer.reminderMinutes },
            dto.scheduleEntryId,
        );
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Cancel a reminder',
        description:
            'Only the owning customer can delete their own reminder. ' +
            'Other customers see 404, identical to non-existent.',
    })
    @ApiParam({ name: 'id', description: 'Reminder UUID' })
    @ApiResponse({ status: 204, description: 'Reminder cancelled' })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 403, description: 'Customer not linked' })
    @ApiResponse({ status: 404, description: 'Reminder not found or not owned by caller' })
    async unsubscribe(
        @CustomerDecorator() customer: CustomerEntity,
        @Param('id', new ParseUUIDPipe()) id: string,
    ): Promise<void> {
        await this.reminderService.unsubscribe(customer.id, id);
    }
}
