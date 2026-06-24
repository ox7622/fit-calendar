import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateClubInfoDto } from '../dto/update-club-info.dto';

// Mirrors main.ts ValidationPipe options so failures here reflect prod behavior.
const runValidation = (overrides: Record<string, unknown> = {}) => {
    const dto = plainToInstance(UpdateClubInfoDto, {
        name: 'Fit Calendar Club',
        address: 'ул. Тестовая, 1',
        workingHours: {},
        ...overrides,
    });
    return validateSync(dto as object, { whitelist: true, forbidNonWhitelisted: true });
};

describe('UpdateClubInfoDto workingHours validation', () => {
    it('accepts open days mixed with closed (null) days', () => {
        const errors = runValidation({
            workingHours: {
                monday: { open: '09:00', close: '22:00' },
                tuesday: { open: '09:00', close: '22:00' },
                sunday: null,
            },
        });
        expect(errors).toHaveLength(0);
    });

    it('accepts an empty map', () => {
        // Regression: the previous @ValidateNested + @Type setup rejected even {}.
        expect(runValidation({ workingHours: {} })).toHaveLength(0);
    });

    it('rejects a malformed time and reports the offending day', () => {
        const errors = runValidation({ workingHours: { monday: { open: '9am', close: '22:00' } } });
        expect(errors).toHaveLength(1);
        const messages = Object.values(errors[0].constraints ?? {});
        expect(messages.join(' ')).toContain('monday.open');
    });

    it('rejects a missing close time', () => {
        const errors = runValidation({ workingHours: { monday: { open: '09:00' } } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monday.close');
    });

    it('rejects an unknown day key', () => {
        const errors = runValidation({ workingHours: { monda: { open: '09:00', close: '22:00' } } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monda');
    });

    it('rejects close earlier than or equal to open', () => {
        const errors = runValidation({ workingHours: { monday: { open: '22:00', close: '09:00' } } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monday.close');
    });

    it('rejects a non-object workingHours', () => {
        const errors = runValidation({ workingHours: 'nope' });
        expect(errors).toHaveLength(1);
    });

    it('surfaces the constraint message on the top-level property (not buried in children)', () => {
        const errors = runValidation({ workingHours: { monday: { open: '9am', close: '22:00' } } });
        // The whole point of the custom validator: a real message lives in
        // `constraints`, so main.ts's exceptionFactory no longer falls back to
        // the generic "имеет некорректное значение".
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].children ?? []).toHaveLength(0);
    });
});

describe('UpdateClubInfoDto mapUrl validation', () => {
    it('accepts a valid Yandex Maps URL', () => {
        expect(runValidation({ mapUrl: 'https://yandex.ru/maps/?pt=37.6173,55.7558&z=16' })).toHaveLength(0);
    });

    it('accepts omitted mapUrl', () => {
        expect(runValidation()).toHaveLength(0);
    });

    it('trims surrounding whitespace before validating', () => {
        const dto = plainToInstance(UpdateClubInfoDto, {
            name: 'Fit Calendar Club',
            address: 'ул. Тестовая, 1',
            workingHours: {},
            mapUrl: '  https://yandex.ru/maps/?pt=37.6173,55.7558&z=16  ',
        });
        expect(validateSync(dto as object, { whitelist: true, forbidNonWhitelisted: true })).toHaveLength(0);
        expect(dto.mapUrl).toBe('https://yandex.ru/maps/?pt=37.6173,55.7558&z=16');
    });

    it('rejects a non-URL string', () => {
        const errors = runValidation({ mapUrl: 'not a url' });
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe('mapUrl');
    });

    it('rejects a URL without protocol', () => {
        const errors = runValidation({ mapUrl: 'yandex.ru/maps/?pt=37,55' });
        expect(errors).toHaveLength(1);
    });
});
