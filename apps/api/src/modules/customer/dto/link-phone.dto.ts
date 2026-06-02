import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LinkPhoneDto {
    @ApiProperty({
        example: '+7 999 555 12 34',
        description: 'Phone in any common Russian format; server normalizes to +7XXXXXXXXXX',
    })
    @IsString()
    @MinLength(7)
    phone: string;
}
