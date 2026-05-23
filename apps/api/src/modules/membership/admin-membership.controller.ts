import {
    Body,
    ConflictException,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminUser } from '../../common/decorators';
import type { IAdminUserContext } from '../../common/guards/admin-auth.guard';
import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

import { AssignMembershipDto, UpdateMembershipDto } from './dto/assign-membership.dto';
import { ActiveExistsErrorDto, MembershipResponseDto, toMembershipResponse } from './dto/membership.dto';
import { MembershipService } from './membership.service';

@ApiTags('Admin Memberships')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller()
export class AdminMembershipController {
    constructor(private readonly membershipService: MembershipService) {}

    @Get('admin/customers/:customerId/memberships')
    @ApiOperation({ summary: 'Membership history for a customer (newest first)' })
    @ApiResponse({ status: 200, type: [MembershipResponseDto] })
    async listForCustomer(
        @Param('customerId', new ParseUUIDPipe()) customerId: string,
    ): Promise<MembershipResponseDto[]> {
        const items = await this.membershipService.findHistoryForCustomer(customerId);
        return items.map((m) => toMembershipResponse(m));
    }

    @Post('admin/customers/:customerId/memberships')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Assign a membership',
        description:
            'Returns 409 with code ACTIVE_MEMBERSHIP_EXISTS when the customer already has an active ' +
            'membership. Admin must cancel it first (two explicit clicks instead of a magic upsert).',
    })
    @ApiResponse({ status: 201, type: MembershipResponseDto })
    @ApiResponse({ status: 400, description: 'Inactive customer/plan or invalid startDate' })
    @ApiResponse({ status: 409, type: ActiveExistsErrorDto })
    async assign(
        @Param('customerId', new ParseUUIDPipe()) customerId: string,
        @Body() dto: AssignMembershipDto,
        @AdminUser() admin: IAdminUserContext,
    ): Promise<MembershipResponseDto> {
        const result = await this.membershipService.assign(
            customerId,
            { planId: dto.planId, startDate: new Date(dto.startDate), notes: dto.notes },
            admin?.id ?? null,
        );
        if (result.status === 'active_exists') {
            const existing = result.existingActive;
            throw new ConflictException({
                statusCode: 409,
                error: 'Conflict',
                code: 'ACTIVE_MEMBERSHIP_EXISTS',
                message: 'У клиента уже есть активный абонемент. Отмените его перед назначением нового.',
                existingActive: {
                    id: existing.id,
                    endDate: existing.endDate.toISOString().slice(0, 10),
                },
            });
        }
        return toMembershipResponse(result.membership);
    }

    @Put('admin/memberships/:id')
    @ApiOperation({
        summary: 'Update endDate or notes',
        description: 'Only endDate + notes are editable. endDate is what Story 7.6 freeze shifts.',
    })
    @ApiResponse({ status: 200, type: MembershipResponseDto })
    @ApiResponse({ status: 404 })
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateMembershipDto,
    ): Promise<MembershipResponseDto> {
        const updated = await this.membershipService.updateMembership(id, {
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            notes: dto.notes,
        });
        return toMembershipResponse(updated);
    }

    @Post('admin/memberships/:id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel a membership (idempotent)' })
    @ApiResponse({ status: 200, type: MembershipResponseDto })
    @ApiResponse({ status: 404 })
    async cancel(@Param('id', new ParseUUIDPipe()) id: string): Promise<MembershipResponseDto> {
        const cancelled = await this.membershipService.cancel(id);
        if (!cancelled) throw new NotFoundException(`Membership ${id} not found`);
        return toMembershipResponse(cancelled);
    }
}
