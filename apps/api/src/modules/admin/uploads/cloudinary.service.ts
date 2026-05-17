import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

/**
 * Story 6.5 — Cloudinary integration for coach + training-type photos.
 *
 * **Dev ergonomics:** Cloudinary credentials are optional in dev (Story 6.5
 * AC: photo upload returns 503 with a clear message when unset). The service
 * configures itself lazily at first use so the API can still boot for
 * read-only workloads without the secrets.
 */
@Injectable()
export class CloudinaryService {
    private readonly logger = new Logger(CloudinaryService.name);
    private configured = false;

    constructor(private readonly configService: ConfigService) {}

    isConfigured(): boolean {
        return !!(
            this.configService.get<string>('CLOUDINARY_CLOUD_NAME') &&
            this.configService.get<string>('CLOUDINARY_API_KEY') &&
            this.configService.get<string>('CLOUDINARY_API_SECRET')
        );
    }

    private ensureConfigured(): void {
        if (this.configured) return;
        if (!this.isConfigured()) {
            throw new ServiceUnavailableException(
                'Загрузка изображений недоступна: Cloudinary не настроен. ' +
                    'Установите CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.',
            );
        }
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
            secure: true,
        });
        this.configured = true;
    }

    /**
     * Uploads a coach photo with face-aware 400×400 fill crop. Deterministic
     * folder (`fitcalendar/coaches/{coachId}`) so re-uploading replaces the
     * previous photo cleanly.
     */
    async uploadCoachPhoto(buffer: Buffer, coachId: string): Promise<string> {
        this.ensureConfigured();
        return this.uploadBuffer(buffer, {
            folder: `fitcalendar/coaches/${coachId}`,
            public_id: 'profile',
            overwrite: true,
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        });
    }

    /**
     * Story 6.7 — club logo. Different transformation (fit, no face gravity)
     * because a logo isn't a portrait. Fixed `public_id: 'logo'` so re-uploads
     * land on the same URL.
     */
    async uploadClubLogo(buffer: Buffer): Promise<string> {
        this.ensureConfigured();
        return this.uploadBuffer(buffer, {
            folder: 'fitcalendar/club',
            public_id: 'logo',
            overwrite: true,
            transformation: [
                { width: 200, height: 200, crop: 'fit' },
                { quality: 'auto', fetch_format: 'auto' },
            ],
        });
    }

    private uploadBuffer(buffer: Buffer, options: Record<string, unknown>): Promise<string> {
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(options, (error, result?: UploadApiResponse) => {
                if (error) {
                    this.logger.error({ err: error }, 'Cloudinary upload failed');
                    reject(error);
                    return;
                }
                if (!result) {
                    reject(new Error('Cloudinary returned no result'));
                    return;
                }
                resolve(result.secure_url);
            });
            stream.end(buffer);
        });
    }
}
