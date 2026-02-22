import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

import { TelegramUser } from '../../common/decorators/telegram-user.decorator';
import { TelegramAuthGuard, ITelegramUserData } from '../../common/guards/telegram-auth.guard';

import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    @UseGuards(TelegramAuthGuard)
    @ApiOperation({
        summary: 'Get current user',
        description: 'Returns the authenticated user data. Creates or updates user on first call.',
    })
    @ApiHeader({
        name: 'X-Telegram-Init-Data',
        description: 'Telegram Mini App initData for authentication',
        required: true,
    })
    @ApiResponse({
        status: 200,
        description: 'Current user data',
        type: UserDto,
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Invalid or missing Telegram authentication',
    })
    async getMe(@TelegramUser() telegramUser: ITelegramUserData): Promise<UserDto> {
        // Upsert user to ensure we have the latest data
        const user = await this.userService.upsert(telegramUser);

        return {
            id: user.id,
            telegramId: String(user.telegramId),
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            reminderMinutes: user.reminderMinutes,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
