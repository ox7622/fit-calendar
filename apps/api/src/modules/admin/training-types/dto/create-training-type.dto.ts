import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateTrainingTypeDto {
    @ApiProperty({ minLength: 2, maxLength: 255 })
    @IsString()
    @MinLength(2)
    @MaxLength(255)
    name: string;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    // `difficulty` / `impactTypes` are taxonomy keys. Shape is validated here;
    // existence + active-state is checked against the DB in the service, so
    // admin-defined values (not a fixed enum) are accepted.
    @ApiProperty({ description: 'Difficulty level key' })
    @IsString()
    difficulty: string;

    @ApiProperty({ type: [String], minItems: 1, description: 'Impact type keys' })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    impactTypes: string[];

    @ApiProperty({ type: [String], maxItems: 30 })
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(30)
    @MaxLength(100, { each: true })
    equipment: string[];

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
