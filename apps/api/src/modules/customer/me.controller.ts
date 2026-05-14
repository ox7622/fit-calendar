import type { Customer as CustomerEntity } from '@fitcalendar/db';
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
    UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Customer as CustomerDecorator } from '../../common/decorators/customer.decorator';
import { TelegramIdentity } from '../../common/decorators/telegram-identity.decorator';
import { TelegramAuthGuard } from '../../common/guards/telegram-auth.guard';
import type { ITelegramUserData } from '../../common/guards/telegram-auth.guard';

import { CustomerService } from './customer.service';
import { CustomerResponseDto, toCustomerResponse } from './dto/customer-response.dto';
import { LinkPhoneDto } from './dto/link-phone.dto';
import { MeLinkedDto, MeUnlinkedDto, MeResponseDto } from './dto/me-response.dto';

@ApiTags('Me')
@Controller('me')
@UseGuards(TelegramAuthGuard)
@ApiHeader({
    name: 'X-Telegram-Init-Data',
    description: 'Telegram Mini App initData for authentication',
    required: true,
})
export class MeController {
    constructor(private readonly customerService: CustomerService) {}

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
                return toCustomerResponse(result.customer!);
            case 'invalid_phone':
                throw new BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    code: 'INVALID_PHONE_FORMAT',
                    message: 'Неверный формат номера. Пример: +7 999 555 12 34.',
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
}
