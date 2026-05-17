import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCoachDto {
    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    bio?: string;

    @ApiProperty({ type: [String], maxItems: 20 })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    specializations: string[];

    @ApiProperty({ type: [String], maxItems: 20 })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(20)
    certifications: string[];

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
