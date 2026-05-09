import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AdminAuthService } from './admin-auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

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
}
