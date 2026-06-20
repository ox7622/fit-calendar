import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

// Keep storage/lookup normalization identical to LoginDto so an admin can sign in
// with whatever casing/spacing they type.
const normalizeLogin = ({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;

export class InviteAdminDto {
    @ApiProperty({ example: 'masha', description: 'Unique login (case-insensitive). Free-form — may be a name.' })
    @Transform(normalizeLogin)
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(255)
    login!: string;

    @ApiProperty({ example: 'Мария Иванова' })
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

    @ApiProperty({ description: 'true, если ссылка была отправлена письмом на email-логин.' })
    emailSent!: boolean;

    @ApiProperty({ nullable: true, description: 'Email, на который ушло письмо, либо null.' })
    sentToEmail!: string | null;
}
