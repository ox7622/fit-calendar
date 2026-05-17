import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { CloudinaryService } from '../cloudinary.service';

const uploadStreamMock = jest.fn();
const configMock = jest.fn();

jest.mock('cloudinary', () => ({
    v2: {
        config: (...args: unknown[]) => configMock(...args),
        uploader: {
            upload_stream: (...args: unknown[]) => uploadStreamMock(...args),
        },
    },
}));

describe('CloudinaryService', () => {
    let service: CloudinaryService;
    let configService: { get: jest.Mock };

    const buildModule = async (env: Record<string, string | undefined>): Promise<CloudinaryService> => {
        configService = {
            get: jest.fn((key: string) => env[key]),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [CloudinaryService, { provide: ConfigService, useValue: configService }],
        }).compile();
        return module.get(CloudinaryService);
    };

    beforeEach(() => {
        uploadStreamMock.mockReset();
        configMock.mockReset();
    });

    it('isConfigured returns false when any credential is missing', async () => {
        service = await buildModule({ CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y' });
        expect(service.isConfigured()).toBe(false);
    });

    it('isConfigured returns true when all three credentials are set', async () => {
        service = await buildModule({
            CLOUDINARY_CLOUD_NAME: 'x',
            CLOUDINARY_API_KEY: 'y',
            CLOUDINARY_API_SECRET: 'z',
        });
        expect(service.isConfigured()).toBe(true);
    });

    it('throws 503 when uploading without configuration', async () => {
        service = await buildModule({});

        await expect(service.uploadCoachPhoto(Buffer.from('img'), 'coach-1')).rejects.toThrow(
            ServiceUnavailableException,
        );
        expect(uploadStreamMock).not.toHaveBeenCalled();
    });

    it('uploads with face-aware 400×400 fill crop into the per-coach folder', async () => {
        service = await buildModule({
            CLOUDINARY_CLOUD_NAME: 'x',
            CLOUDINARY_API_KEY: 'y',
            CLOUDINARY_API_SECRET: 'z',
        });
        uploadStreamMock.mockImplementationOnce((options, cb: (err: unknown, result?: unknown) => void) => {
            // Verify the transformation contract before invoking the callback.
            expect(options.folder).toBe('fitcalendar/coaches/coach-1');
            expect(options.overwrite).toBe(true);
            expect(options.transformation[0]).toMatchObject({
                width: 400,
                height: 400,
                crop: 'fill',
                gravity: 'face',
            });
            return {
                end: (): void => {
                    cb(null, { secure_url: 'https://cdn.example/photo.jpg' });
                },
            };
        });

        const url = await service.uploadCoachPhoto(Buffer.from('img'), 'coach-1');

        expect(url).toBe('https://cdn.example/photo.jpg');
        expect(configMock).toHaveBeenCalledWith(
            expect.objectContaining({ cloud_name: 'x', api_key: 'y', api_secret: 'z', secure: true }),
        );
    });

    it('rejects when Cloudinary upload returns an error', async () => {
        service = await buildModule({
            CLOUDINARY_CLOUD_NAME: 'x',
            CLOUDINARY_API_KEY: 'y',
            CLOUDINARY_API_SECRET: 'z',
        });
        uploadStreamMock.mockImplementationOnce((_options, cb: (err: unknown, result?: unknown) => void) => ({
            end: (): void => cb(new Error('cloudinary down')),
        }));

        await expect(service.uploadCoachPhoto(Buffer.from('img'), 'coach-1')).rejects.toThrow('cloudinary down');
    });
});
