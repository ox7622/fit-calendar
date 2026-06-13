import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminUser } from '../../../common/decorators/admin-user.decorator';
import { AdminAuthGuard } from '../../../common/guards/admin-auth.guard';

import { AdminUsersService } from './admin-users.service';
import { AdminUserListItemDto } from './dto/admin-user.dto';
import { InviteAdminDto, IssuedTokenResponseDto } from './dto/invite-admin.dto';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUsersController {
    constructor(private readonly usersService: AdminUsersService) {}

    @Get()
    @ApiOperation({ summary: 'List all admin users (active + inactive)' })
    @ApiResponse({ status: 200, type: [AdminUserListItemDto] })
    list(): Promise<AdminUserListItemDto[]> {
        return this.usersService.list();
    }

    @Post('invite')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Invite a new admin (or reactivate an inactive row with this login)',
        description:
            'Returns a one-time token URL fragment. Show it to the issuer once — the plaintext is not persisted.',
    })
    @ApiResponse({ status: 201, type: IssuedTokenResponseDto })
    @ApiResponse({ status: 409, description: 'Login already belongs to an active admin' })
    invite(@Body() dto: InviteAdminDto, @AdminUser('id') issuerAdminId: string): Promise<IssuedTokenResponseDto> {
        return this.usersService.invite(issuerAdminId, dto.login, dto.name);
    }

    @Post(':id/reset-password')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Issue a password-reset token for an existing admin' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 201, type: IssuedTokenResponseDto })
    @ApiResponse({ status: 404 })
    issueReset(
        @Param('id', new ParseUUIDPipe()) id: string,
        @AdminUser('id') issuerAdminId: string,
    ): Promise<IssuedTokenResponseDto> {
        return this.usersService.issueReset(issuerAdminId, id);
    }

    @Post(':id/deactivate')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Deactivate an admin (and invalidate their outstanding tokens)' })
    @ApiParam({ name: 'id' })
    @ApiResponse({ status: 204, description: 'Deactivated' })
    @ApiResponse({ status: 409, description: 'Cannot deactivate yourself or the last active admin' })
    @ApiResponse({ status: 404 })
    deactivate(@Param('id', new ParseUUIDPipe()) id: string, @AdminUser('id') issuerAdminId: string): Promise<void> {
        return this.usersService.deactivate(issuerAdminId, id);
    }
}
