import { ApiProperty } from '@nestjs/swagger';

export class AdminUserListItemDto {
    @ApiProperty()
    id!: string;

    @ApiProperty()
    email!: string;

    @ApiProperty()
    name!: string;

    @ApiProperty()
    isActive!: boolean;

    @ApiProperty({ nullable: true, type: String })
    lastLoginAt!: string | null;

    @ApiProperty()
    createdAt!: string;
}
