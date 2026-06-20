import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Ip,
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
import { FreezeEventDto, FreezeResultDto, UndoFreezeResultDto, toFreezeDto } from './dto/freeze.dto';
import { GuestVisitDto, GuestVisitResultDto, UndoGuestVisitResultDto, toGuestVisitDto } from './dto/guest-visit.dto';
import { ActiveExistsErrorDto, MembershipResponseDto, toMembershipResponse } from './dto/membership.dto';
import { RecordFreezeDto } from './dto/record-freeze.dto';
import { RecordGuestVisitDto } from './dto/record-guest-visit.dto';
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

    @Get('admin/memberships/:id/guest-visits')
    @ApiOperation({ summary: 'List guest visits for a membership (newest first)' })
    @ApiResponse({ status: 200, type: [GuestVisitDto] })
    async listGuestVisits(@Param('id', new ParseUUIDPipe()) id: string): Promise<GuestVisitDto[]> {
        const visits = await this.membershipService.findGuestVisitsByMembership(id);
        return visits.map(toGuestVisitDto);
    }

    @Post('admin/memberships/:id/guest-visits')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Record a guest visit (decrements remaining counter atomically)',
        description:
            'Returns 400 with code NO_GUEST_VISITS_REMAINING when the counter is exhausted, or ' +
            'MEMBERSHIP_NOT_ACTIVE when the membership is expired or cancelled.',
    })
    @ApiResponse({ status: 201, type: GuestVisitResultDto })
    @ApiResponse({ status: 400, description: 'NO_GUEST_VISITS_REMAINING or MEMBERSHIP_NOT_ACTIVE' })
    @ApiResponse({ status: 404 })
    async recordGuestVisit(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: RecordGuestVisitDto,
        @AdminUser() admin: IAdminUserContext,
    ): Promise<GuestVisitResultDto> {
        const result = await this.membershipService.recordGuestVisit(
            id,
            { visitedAt: dto.visitedAt ? new Date(dto.visitedAt) : undefined, notes: dto.notes },
            admin.id,
        );
        return { visit: toGuestVisitDto(result.visit), remaining: result.remaining };
    }

    @Delete('admin/guest-visits/:visitId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Undo a guest visit (increments remaining counter)',
        description:
            'Flat URL (no membershipId) because the visit id is globally unique. Mirrors how ' +
            'Story 6.4 cancellation routes work.',
    })
    @ApiResponse({ status: 200, type: UndoGuestVisitResultDto })
    @ApiResponse({ status: 404 })
    async undoGuestVisit(
        @Param('visitId', new ParseUUIDPipe()) visitId: string,
        @AdminUser() admin: IAdminUserContext,
        @Ip() ipAddress: string,
    ): Promise<UndoGuestVisitResultDto> {
        return this.membershipService.undoGuestVisit(visitId, { adminUserId: admin.id, ipAddress });
    }

    @Get('admin/memberships/:id/freezes')
    @ApiOperation({ summary: 'List freezes for a membership (ordered by startDate desc)' })
    @ApiResponse({ status: 200, type: [FreezeEventDto] })
    async listFreezes(@Param('id', new ParseUUIDPipe()) id: string): Promise<FreezeEventDto[]> {
        const freezes = await this.membershipService.findFreezesByMembership(id);
        return freezes.map(toFreezeDto);
    }

    @Post('admin/memberships/:id/freezes')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Record a freeze (shifts membership endDate + decrements freezeDaysRemaining atomically)',
        description:
            'Returns 400 with code INVALID_DURATION / MEMBERSHIP_NOT_ACTIVE / FREEZE_OVERLAPS_EXISTING / ' +
            'INSUFFICIENT_FREEZE_DAYS depending on which guard fails. The endDate shift happens at ' +
            'record time even for future startDates (see Story 7.6 Dev Notes).',
    })
    @ApiResponse({ status: 201, type: FreezeResultDto })
    @ApiResponse({ status: 400 })
    @ApiResponse({ status: 404 })
    async recordFreeze(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: RecordFreezeDto,
        @AdminUser() admin: IAdminUserContext,
    ): Promise<FreezeResultDto> {
        const result = await this.membershipService.recordFreeze(
            id,
            { startDate: dto.startDate, durationDays: dto.durationDays, notes: dto.notes },
            admin.id,
        );
        const membership = await this.membershipService.findById(result.membership.id);
        const currentFreeze = await this.membershipService.getActiveFreezeForMembership(result.membership.id);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { freeze: toFreezeDto(result.freeze), membership: toMembershipResponse(membership!, { currentFreeze }) };
    }

    @Delete('admin/freezes/:freezeId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Undo a freeze (reverses endDate shift + counter)',
        description: 'Flat URL — freeze id is globally unique. Same pattern as guest-visit undo.',
    })
    @ApiResponse({ status: 200, type: UndoFreezeResultDto })
    @ApiResponse({ status: 404 })
    async undoFreeze(
        @Param('freezeId', new ParseUUIDPipe()) freezeId: string,
        @AdminUser() admin: IAdminUserContext,
        @Ip() ipAddress: string,
    ): Promise<UndoFreezeResultDto> {
        const result = await this.membershipService.undoFreeze(freezeId, { adminUserId: admin.id, ipAddress });
        const membership = await this.membershipService.findById(result.membership.id);
        const currentFreeze = await this.membershipService.getActiveFreezeForMembership(result.membership.id);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { membership: toMembershipResponse(membership!, { currentFreeze }) };
    }
}
