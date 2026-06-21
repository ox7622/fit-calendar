import type { Customer as CustomerEntity } from '@fitcalendar/db';
import { VALIDATION_MESSAGES } from '@fitcalendar/shared';
import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Customer as CustomerDecorator } from '../../common/decorators/customer.decorator';
import { TelegramIdentity } from '../../common/decorators/telegram-identity.decorator';
import { RequiresLinkedCustomer } from '../../common/guards/requires-linked-customer.guard';
import { TelegramAuthGuard } from '../../common/guards/telegram-auth.guard';
import type { ITelegramUserData } from '../../common/guards/telegram-auth.guard';
import { BotSubscriberService } from '../bot-subscriber/bot-subscriber.service';

import { CustomerService } from './customer.service';
import { CustomerResponseDto, toCustomerResponse } from './dto/customer-response.dto';
import { LinkPhoneDto } from './dto/link-phone.dto';
import { MeLinkedDto, MeUnlinkedDto, MeResponseDto } from './dto/me-response.dto';
import { SettingsResponseDto, UpdateSettingsDto } from './dto/settings.dto';

@ApiTags('Me')
@Controller('me')
@UseGuards(TelegramAuthGuard)
@ApiHeader({
    name: 'X-Telegram-Init-Data',
    description: 'Telegram Mini App initData for authentication',
    required: true,
})
export class MeController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly botSubscribers: BotSubscriberService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Get the caller in one of two shapes',
        description:
            'Linked: `{ linked: true, customer: {...} }`. Unlinked: `{ linked: false, telegramIdentity: {...} }`. ' +
            'The Mini App uses the discriminator to decide whether to show the LinkPhonePrompt.',
    })
    @ApiResponse({ status: 200, schema: MeResponseDto.schemaRef })
    @ApiResponse({ status: 401, description: 'Missing or invalid Telegram initData' })
    getMe(
        @CustomerDecorator() customer: CustomerEntity | null,
        @TelegramIdentity() identity: ITelegramUserData,
    ): MeLinkedDto | MeUnlinkedDto {
        void this.botSubscribers
            .upsert({
                telegramId: identity.id,
                firstName: identity.first_name ?? null,
                username: identity.username ?? null,
                source: 'mini_app',
            })
            .catch(() => undefined);

        if (customer) {
            return { linked: true, customer: toCustomerResponse(customer) };
        }
        return {
            linked: false,
            telegramIdentity: {
                firstName: identity.first_name,
                username: identity.username ?? null,
            },
        };
    }

    @Post('link-phone')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Link the calling Telegram identity to a customer by phone',
        description: 'Idempotent: re-linking the same phone to the same Telegram id returns 200.',
    })
    @ApiResponse({ status: 200, type: CustomerResponseDto, description: 'Successfully linked' })
    @ApiResponse({
        status: 400,
        description: 'Phone could not be normalized (code: INVALID_PHONE_FORMAT)',
    })
    @ApiResponse({
        status: 404,
        description: 'No customer with this phone (code: PHONE_NOT_FOUND)',
    })
    @ApiResponse({
        status: 409,
        description: 'Phone already linked to a different Telegram account (code: PHONE_ALREADY_LINKED_TO_OTHER)',
    })
    async linkPhone(
        @Body() dto: LinkPhoneDto,
        @TelegramIdentity() identity: ITelegramUserData,
    ): Promise<CustomerResponseDto> {
        const result = await this.customerService.linkTelegramToPhone(dto.phone, {
            id: identity.id,
            username: identity.username,
        });

        switch (result.status) {
            case 'linked':
                return toCustomerResponse(result.customer);
            case 'invalid_phone':
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'INVALID_PHONE_FORMAT',
                    message: VALIDATION_MESSAGES.INVALID_PHONE_FORMAT,
                });
            case 'phone_not_found':
                throw new NotFoundException({
                    statusCode: 404,
                    error: 'Not Found',
                    code: 'PHONE_NOT_FOUND',
                    message: 'Этот номер не зарегистрирован. Обратитесь на ресепшн.',
                });
            case 'phone_already_linked':
                throw new ConflictException({
                    statusCode: 409,
                    error: 'Conflict',
                    code: 'PHONE_ALREADY_LINKED_TO_OTHER',
                    message: 'Этот номер уже привязан к другому аккаунту. Свяжитесь с админом.',
                });
            default:
                // Exhaustiveness check — TLinkPhoneStatus is a closed union.
                throw new Error(`Unhandled link-phone status: ${(result as { status: string }).status}`);
        }
    }

    @Get('settings')
    @UseGuards(RequiresLinkedCustomer)
    @ApiOperation({ summary: "Read the calling member's reminder offset preference" })
    @ApiResponse({ status: 200, type: SettingsResponseDto })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 403, description: 'Customer not linked (code: CUSTOMER_NOT_LINKED)' })
    getSettings(@CustomerDecorator() customer: CustomerEntity): SettingsResponseDto {
        // The customer record is already loaded by TelegramAuthGuard, so no extra
        // DB hit needed — read straight from the decorator.
        return { reminderMinutes: customer.reminderMinutes };
    }

    @Put('settings')
    @UseGuards(RequiresLinkedCustomer)
    @ApiOperation({
        summary: 'Update the reminder offset preference',
        description:
            'Allowed values: 15, 30, 60, 120 minutes. Existing reminders are NOT re-scheduled — ' +
            'only future subscriptions use the new value (notifyAt is precomputed at subscribe time).',
    })
    @ApiResponse({ status: 200, type: SettingsResponseDto })
    @ApiResponse({ status: 400, description: 'reminderMinutes is not in the allowed enum' })
    @ApiResponse({ status: 401 })
    @ApiResponse({ status: 403 })
    async updateSettings(
        @CustomerDecorator() customer: CustomerEntity,
        @Body() dto: UpdateSettingsDto,
    ): Promise<SettingsResponseDto> {
        const updated = await this.customerService.updateReminderMinutes(customer.id, dto.reminderMinutes);
        // The customer was loaded by the guard from the request, so update should always find it.
        // If it returned null something's racing — surface as 500 (Nest's default for unhandled returns).
        if (!updated) {
            throw new Error(`Customer ${customer.id} disappeared mid-request`);
        }
        return { reminderMinutes: updated.reminderMinutes };
    }
}
