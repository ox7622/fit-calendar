import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ScheduleFilterDto } from '../dto/schedule-filter.dto';

// Mirrors the global ValidationPipe config in main.ts so these tests reproduce
// the real request-time behaviour (a non-whitelisted query prop yields 400).
const PIPE_OPTS = { whitelist: true, forbidNonWhitelisted: true } as const;

describe('ScheduleFilterDto — weekOffset', () => {
    it('accepts weekOffset and coerces the string to an int (regression for the 400)', async () => {
        const dto = plainToInstance(ScheduleFilterDto, { weekOffset: '1' });
        const errors = await validate(dto, PIPE_OPTS);
        expect(errors).toHaveLength(0);
        expect(dto.weekOffset).toBe(1);
    });

    it('falls back to 0 for an unparseable weekOffset rather than 400', async () => {
        const dto = plainToInstance(ScheduleFilterDto, { weekOffset: 'abc' });
        const errors = await validate(dto, PIPE_OPTS);
        expect(errors).toHaveLength(0);
        expect(dto.weekOffset).toBe(0);
    });

    it('still rejects a genuinely unknown query property', async () => {
        const dto = plainToInstance(ScheduleFilterDto, { bogusParam: 'x' });
        const errors = await validate(dto, PIPE_OPTS);
        expect(errors.length).toBeGreaterThan(0);
    });
});
