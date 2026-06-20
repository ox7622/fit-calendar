import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IGeocodeResult {
    latitude: number;
    longitude: number;
}

interface IYandexGeocodeResponse {
    response?: {
        GeoObjectCollection?: {
            featureMember?: Array<{ GeoObject?: { Point?: { pos?: string } } }>;
        };
    };
}

/**
 * Geocodes a free-form address to coordinates via the Yandex Geocoder HTTP API.
 * Requires YANDEX_GEOCODER_API_KEY; without it the feature is disabled (503).
 */
@Injectable()
export class GeocodingService {
    private readonly logger = new Logger(GeocodingService.name);

    constructor(private readonly configService: ConfigService) {}

    async geocode(address: string): Promise<IGeocodeResult> {
        const apiKey = this.configService.get<string>('YANDEX_GEOCODER_API_KEY');
        if (!apiKey) {
            throw new ServiceUnavailableException('Геокодер не настроен (нет YANDEX_GEOCODER_API_KEY)');
        }

        const url = new URL('https://geocode-maps.yandex.ru/1.x/');
        url.searchParams.set('apikey', apiKey);
        url.searchParams.set('format', 'json');
        url.searchParams.set('geocode', address);
        url.searchParams.set('results', '1');
        url.searchParams.set('lang', 'ru_RU');

        let response: Response;
        try {
            response = await fetch(url);
        } catch (error) {
            this.logger.error('Yandex geocoder request failed', error);
            throw new ServiceUnavailableException('Сервис геокодирования недоступен');
        }

        if (!response.ok) {
            // 403 typically means an invalid key or exhausted quota.
            this.logger.warn(`Yandex geocoder returned HTTP ${response.status}`);
            throw new ServiceUnavailableException('Сервис геокодирования вернул ошибку');
        }

        const data = (await response.json()) as IYandexGeocodeResponse;
        const pos = data.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
        if (!pos) {
            throw new BadRequestException('Не удалось определить координаты по этому адресу');
        }

        // Yandex returns "longitude latitude".
        const parts = pos.split(' ');
        const longitude = Number(parts[0]);
        const latitude = Number(parts[1]);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new BadRequestException('Не удалось определить координаты по этому адресу');
        }

        return { latitude, longitude };
    }
}
