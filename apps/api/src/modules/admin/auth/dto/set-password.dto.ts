import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SetPasswordDto {
    @ApiProperty({ description: 'One-time plaintext token from the invite/reset link.' })
    @IsString()
    @IsNotEmpty()
    token!: string;

    @ApiProperty({ minLength: 8, maxLength: 128 })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    @Matches(/[A-Za-z]/, { message: 'Пароль должен содержать хотя бы одну букву' })
    @Matches(/\d/, { message: 'Пароль должен содержать хотя бы одну цифру' })
    password!: string;
}

export class InviteTokenInfoDto {
    @ApiProperty()
    email!: string;

    @ApiProperty()
    name!: string;

    @ApiProperty({ enum: ['invite', 'reset'] })
    purpose!: 'invite' | 'reset';
}
