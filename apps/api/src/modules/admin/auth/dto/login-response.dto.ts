import { ApiProperty } from '@nestjs/swagger';

export class AdminProfileDto {
    @ApiProperty({ description: 'Admin user UUID' })
    id!: string;

    @ApiProperty({ description: 'Admin email' })
    email!: string;

    @ApiProperty({ description: 'Admin display name' })
    name!: string;
}

export class LoginResponseDto {
    @ApiProperty({ description: 'Signed JWT (HS256, 24h expiry)' })
    token!: string;

    @ApiProperty({ type: AdminProfileDto })
    admin!: AdminProfileDto;
}
