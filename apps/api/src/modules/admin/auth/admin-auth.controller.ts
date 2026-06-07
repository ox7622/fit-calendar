import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminAuthService } from './admin-auth.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { InviteTokenInfoDto, SetPasswordDto } from './dto/set-password.dto';

// Russian-language single error message used for any auth failure (wrong email,
// wrong password, inactive admin) — AC6: no user enumeration leakage.
const INVALID_CREDENTIALS_MESSAGE = 'Неверный email или пароль';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly authService: AdminAuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 900_000 } })
    @ApiOperation({ summary: 'Admin login (email + password)' })
    @ApiResponse({ status: 200, description: 'Login successful', type: LoginResponseDto })
    @ApiResponse({ status: 401, description: INVALID_CREDENTIALS_MESSAGE })
    @ApiResponse({ status: 429, description: 'Too many requests (5 per 15 minutes per IP)' })
    async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
        const admin = await this.authService.validateCredentials(dto.email, dto.password);
        if (!admin) {
            throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
        }

        const token = this.authService.signToken(admin);
        await this.authService.recordLogin(admin.id);

        return {
            token,
            admin: { id: admin.id, email: admin.email, name: admin.name },
        };
    }

    @Get('invite-token/:token')
    @Throttle({ default: { limit: 5, ttl: 900_000 } })
    @ApiOperation({
        summary: 'Resolve an invite/reset token to the target email + name (public)',
        description: 'Used by the set-password page to greet the recipient before they pick a password.',
    })
    @ApiParam({ name: 'token' })
    @ApiResponse({ status: 200, type: InviteTokenInfoDto })
    @ApiResponse({ status: 404, description: 'Unknown, expired, or consumed token' })
    getInviteTokenInfo(@Param('token') token: string): Promise<InviteTokenInfoDto> {
        return this.authService.getInviteTokenInfo(token);
    }

    @Post('set-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Throttle({ default: { limit: 5, ttl: 900_000 } })
    @ApiOperation({
        summary: 'Consume an invite/reset token to set a new password (public)',
        description: 'On success the admin row is set isActive=true and the token is marked consumed.',
    })
    @ApiResponse({ status: 204, description: 'Password set; user can now log in' })
    @ApiResponse({ status: 400, description: 'Password fails policy' })
    @ApiResponse({ status: 404, description: 'Unknown token' })
    @ApiResponse({ status: 410, description: 'Token already used or expired' })
    @ApiResponse({ status: 429, description: 'Too many requests' })
    async setPassword(@Body() dto: SetPasswordDto): Promise<void> {
        await this.authService.setPasswordWithToken(dto.token, dto.password);
    }
}
