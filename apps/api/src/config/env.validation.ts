import { plainToInstance } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

// Substring tokens that mark a JWT_SECRET as a placeholder. Refused in production
// so a copy-pasted .env.example value can't accidentally ship.
const JWT_SECRET_PLACEHOLDER_TOKENS = [
    'replace-me',
    'replace_me',
    'changeme',
    'change-me',
    'change_me',
    'your_jwt_secret',
    'your-jwt-secret',
    'placeholder',
];

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
    @MinLength(32, {
        message: 'JWT_SECRET must be at least 32 characters long for cryptographic safety',
    })
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

    // Telegram Bot configuration
    @IsString()
    @IsNotEmpty()
    TELEGRAM_BOT_TOKEN!: string;

    @IsString()
    @IsNotEmpty()
    TELEGRAM_WEBHOOK_SECRET!: string;

    @IsString()
    @IsOptional()
    MINI_APP_URL?: string;

    // Cloudinary (Story 6.5). Optional in dev — upload endpoints return 503
    // with a clear message when unset so local devs aren't blocked. Required
    // in production (enforced at first upload, not at boot, so the API can
    // still run for read-only workloads).
    @IsString()
    @IsOptional()
    CLOUDINARY_CLOUD_NAME?: string;

    @IsString()
    @IsOptional()
    CLOUDINARY_API_KEY?: string;

    @IsString()
    @IsOptional()
    CLOUDINARY_API_SECRET?: string;

    // Swagger gating. Defaults to "true" for dev ergonomics; set "false" in
    // production so the API schema isn't publicly discoverable. Parsed at the
    // call site (see `main.ts`) — kept as a string here because class-transformer's
    // implicit boolean coercion treats "false" as truthy.
    @IsString()
    @IsOptional()
    @IsIn(['true', 'false'])
    SWAGGER_ENABLED?: string = 'true';
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

    if (validatedConfig.NODE_ENV === 'production') {
        const secretLower = validatedConfig.JWT_SECRET.toLowerCase();
        const matchedToken = JWT_SECRET_PLACEHOLDER_TOKENS.find((token) => secretLower.includes(token));
        if (matchedToken) {
            throw new Error(
                `Environment validation failed:\nJWT_SECRET: contains placeholder token "${matchedToken}" — ` +
                    'refusing to boot in production. Generate a real secret (e.g. `openssl rand -base64 48`).',
            );
        }
    }

    return validatedConfig;
}
