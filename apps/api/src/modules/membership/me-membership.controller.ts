import { Customer } from '@fitcalendar/db';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Customer as CustomerDecorator } from '../../common/decorators';
import { RequiresLinkedCustomer, TelegramAuthGuard } from '../../common/guards';

import { MeMembershipResponseDto, toMembershipResponse } from './dto/membership.dto';
import { MembershipService } from './membership.service';

@ApiTags('Me')
@Controller('me/membership')
@UseGuards(TelegramAuthGuard, RequiresLinkedCustomer)
export class MeMembershipController {
    constructor(private readonly membershipService: MembershipService) {}

    @Get()
    @ApiOperation({
        summary: 'Current active membership for the calling customer',
        description: '{ membership: null } when the customer has no active membership.',
    })
    @ApiResponse({ status: 200, type: MeMembershipResponseDto })
    @ApiResponse({ status: 403, description: 'Telegram identity is not linked to a customer' })
    async getMine(@CustomerDecorator() customer: Customer): Promise<MeMembershipResponseDto> {
        const membership = await this.membershipService.getCurrentForCustomer(customer.id);
        if (!membership) return { membership: null };
        const currentFreeze = await this.membershipService.getActiveFreezeForMembership(membership.id);
        return { membership: toMembershipResponse(membership, { currentFreeze }) };
    }
}
