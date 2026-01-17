import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export class EnvironmentVariables {
    // Database configuration
    @IsString()
    @IsNotEmpty()
    NX_DB_HOST!: string;

    @IsNumber()
    @IsNotEmpty()
    NX_DB_PORT!: number;

    @IsString()
    @IsNotEmpty()
    NX_DB_NAME!: string;

    @IsString()
    @IsNotEmpty()
    NX_DB_USER!: string;

    @IsString()
    @IsNotEmpty()
    NX_DB_PASS!: string;

    // API configuration
    @IsNumber()
    @IsNotEmpty()
    NX_BE_API_FITCALENDAR_SERVICE_PORT!: number;

    @IsString()
    @IsNotEmpty()
    NX_BE_API_FITCALENDAR_SERVICE_PREFIX!: string;

    // Authentication
    @IsString()
    @IsNotEmpty()
    JWT_SECRET!: string;

    // Optional variables with defaults
    @IsString()
    @IsOptional()
    LOG_LEVEL?: string = 'info';

    @IsString()
    @IsOptional()
    NODE_ENV?: string = 'development';

    // CORS origins (optional)
    @IsString()
    @IsOptional()
    CORS_ORIGIN_MINI_APP?: string;

    @IsString()
    @IsOptional()
    CORS_ORIGIN_ADMIN?: string;
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
    const validatedConfig = plainToInstance(EnvironmentVariables, config, {
        enableImplicitConversion: true,
    });

    const errors = validateSync(validatedConfig, {
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const errorMessages = errors
            .map((error) => {
                const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
                return `${error.property}: ${constraints}`;
            })
            .join('\n');
        throw new Error(`Environment validation failed:\n${errorMessages}`);
    }

    return validatedConfig;
}
