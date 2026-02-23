import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class ScheduleFilterDto {
    @IsOptional()
    @IsString()
    @IsIn(['beginner', 'intermediate', 'advanced'])
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';

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
            return value.split(',').map((v) => v.trim()).filter(Boolean);
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
