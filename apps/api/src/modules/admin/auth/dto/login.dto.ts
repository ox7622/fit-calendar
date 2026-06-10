import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Normalize login on the way in so lookups are case/whitespace-insensitive and
// match the same normalization applied when the account was invited.
const normalizeLogin = ({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @Transform(normalizeLogin)
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    login!: string;

    @ApiProperty({ example: 'admin123' })
    @IsString()
    @IsNotEmpty()
    password!: string;
}
