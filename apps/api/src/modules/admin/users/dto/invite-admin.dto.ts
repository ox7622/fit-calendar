import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class InviteAdminDto {
    @ApiProperty({ example: 'new-admin@fitcalendar.ru' })
    @IsEmail()
    @MaxLength(255)
    email!: string;

    @ApiProperty({ example: 'Test Admin' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name!: string;
}

export class IssuedTokenResponseDto {
    @ApiProperty({
        description: 'Plaintext one-time token. Returned exactly once — only its sha256 is persisted.',
    })
    token!: string;

    @ApiProperty()
    adminUserId!: string;

    @ApiProperty({ description: 'ISO timestamp at which the token expires.' })
    expiresAt!: string;

    @ApiProperty({
        enum: ['created', 'reactivated', 'reset'],
        description: 'created = new row inserted; reactivated = inactive row recycled; reset = active row.',
    })
    action!: 'created' | 'reactivated' | 'reset';
}
