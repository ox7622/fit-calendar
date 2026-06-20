import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateClubInfoDto } from '../dto/update-club-info.dto';

const validate = (workingHours: unknown) => {
    const dto = plainToInstance(UpdateClubInfoDto, {
        name: 'Fit Calendar Club',
        address: 'ул. Тестовая, 1',
        workingHours,
    });
    // Mirror main.ts ValidationPipe options.
    return validateSync(dto as object, { whitelist: true, forbidNonWhitelisted: true });
};

describe('UpdateClubInfoDto workingHours validation', () => {
    it('accepts open days mixed with closed (null) days', () => {
        const errors = validate({
            monday: { open: '09:00', close: '22:00' },
            tuesday: { open: '09:00', close: '22:00' },
            sunday: null,
        });
        expect(errors).toHaveLength(0);
    });

    it('accepts an empty map', () => {
        // Regression: the previous @ValidateNested + @Type setup rejected even {}.
        expect(validate({})).toHaveLength(0);
    });

    it('rejects a malformed time and reports the offending day', () => {
        const errors = validate({ monday: { open: '9am', close: '22:00' } });
        expect(errors).toHaveLength(1);
        const messages = Object.values(errors[0].constraints ?? {});
        expect(messages.join(' ')).toContain('monday.open');
    });

    it('rejects a missing close time', () => {
        const errors = validate({ monday: { open: '09:00' } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monday.close');
    });

    it('rejects an unknown day key', () => {
        const errors = validate({ monda: { open: '09:00', close: '22:00' } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monda');
    });

    it('rejects close earlier than or equal to open', () => {
        const errors = validate({ monday: { open: '22:00', close: '09:00' } });
        expect(errors).toHaveLength(1);
        expect(Object.values(errors[0].constraints ?? {}).join(' ')).toContain('monday.close');
    });

    it('rejects a non-object workingHours', () => {
        const errors = validate('nope');
        expect(errors).toHaveLength(1);
    });

    it('surfaces the constraint message on the top-level property (not buried in children)', () => {
        const errors = validate({ monday: { open: '9am', close: '22:00' } });
        // The whole point of the custom validator: a real message lives in
        // `constraints`, so main.ts's exceptionFactory no longer falls back to
        // the generic "имеет некорректное значение".
        expect(errors[0].constraints).toBeDefined();
        expect(errors[0].children ?? []).toHaveLength(0);
    });
});
