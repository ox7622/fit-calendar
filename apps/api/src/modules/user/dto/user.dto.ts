import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
    @ApiProperty({ description: 'User ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
    id: string;

    @ApiProperty({ description: 'Telegram user ID', example: '123456789' })
    telegramId: string;

    @ApiProperty({ description: 'User first name', example: 'John' })
    firstName: string;

    @ApiProperty({ description: 'User last name', example: 'Doe', nullable: true })
    lastName: string | null;

    @ApiProperty({ description: 'Telegram username', example: 'johndoe', nullable: true })
    username: string | null;

    @ApiProperty({ description: 'Reminder offset in minutes', example: 30 })
    reminderMinutes: number;

    @ApiProperty({ description: 'Account creation date' })
    createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;
}
