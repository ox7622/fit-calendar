import { TrimLowercaseTransformer } from '@fitcalendar/nest-shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'admin' })
    @Transform(TrimLowercaseTransformer)
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    login!: string;

    @ApiProperty({ example: 'admin123' })
    @IsString()
    @IsNotEmpty()
    password!: string;
}
