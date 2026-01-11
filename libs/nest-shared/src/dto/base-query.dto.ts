import { ESortField, ESortOrder } from '@fitcalendar/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Базовый класс для запросов с сортировкой и поиском.
 */
export class BaseQueryDto {
    @ApiPropertyOptional({
        description: 'Поле для сортировки',
        example: 'name',
        enum: ESortField,
        enumName: 'ESortField',
    })
    @IsOptional()
    @IsEnum(ESortField)
    public sortField?: ESortField;

    @ApiPropertyOptional({
        description: 'Строка для поиска по полям сущности',
        example: 'phone',
    })
    @IsOptional()
    @IsString()
    public search?: string;

    @ApiPropertyOptional({
        description: 'Направление сортировки',
        example: 'DESC',
        enum: ESortOrder,
        enumName: 'ESortOrder',
    })
    @IsOptional()
    @IsEnum(ESortOrder)
    public sortOrder?: ESortOrder;
}
