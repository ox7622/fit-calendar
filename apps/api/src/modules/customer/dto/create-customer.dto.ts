import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
    @ApiProperty({ example: 'Иван', maxLength: 255 })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    firstName: string;

    @ApiPropertyOptional({ example: 'Петров', nullable: true, maxLength: 255 })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    lastName?: string | null;

    @ApiProperty({ example: '+7 999 555 12 34', description: 'Any common Russian format; normalized server-side' })
    @IsString()
    @MinLength(7)
    @MaxLength(32)
    phone: string;

    @ApiPropertyOptional({ example: 'ivan@example.com', nullable: true })
    @IsOptional()
    @IsEmail()
    email?: string | null;

    @ApiPropertyOptional({ example: 123456789, nullable: true, description: 'Telegram user id' })
    @IsOptional()
    @IsInt()
    telegramId?: number | null;

    @ApiPropertyOptional({ example: 'ivan_petrov', nullable: true })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    telegramUsername?: string | null;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ nullable: true })
    @IsOptional()
    @IsString()
    notes?: string | null;
}
