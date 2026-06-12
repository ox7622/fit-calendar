import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class ScheduleFilterDto {
    /**
     * Week to fetch relative to the current week (0 = current), used by GET /schedule/week.
     * Coerced to an integer; unparseable values fall back to 0. The service clamps the range.
     */
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        const parsed = Number.parseInt(String(value), 10);
        return Number.isNaN(parsed) ? 0 : parsed;
    })
    @IsInt()
    weekOffset?: number;

    @IsOptional()
    @IsString()
    difficultyLevel?: string;

    @IsOptional()
    @IsString()
    coachId?: string;

    @IsOptional()
    @IsString()
    trainingTypeId?: string;

    /**
     * Comma-separated list of impact types, e.g. "cardio,strength"
     * Transformed to an array before validation.
     */
    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value === 'string') {
            return value
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean);
        }
        return value;
    })
    @IsArray()
    @IsString({ each: true })
    impactType?: string[];

    @IsOptional()
    @Transform(({ value }: { value: unknown }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    includeCancelled?: boolean;
}
