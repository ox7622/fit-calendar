import { plainToInstance } from 'class-transformer';

import { DeleteScheduleEntryQueryDto } from '../dto/delete-schedule-entry-query.dto';

describe('DeleteScheduleEntryQueryDto', () => {
    it('coerces the string "false" to boolean false', () => {
        const dto = plainToInstance(DeleteScheduleEntryQueryDto, { notify: 'false' });
        expect(dto.notify).toBe(false);
    });

    it('treats the string "true" as true', () => {
        expect(plainToInstance(DeleteScheduleEntryQueryDto, { notify: 'true' }).notify).toBe(true);
    });

    it('defaults to true when the param is absent', () => {
        expect(plainToInstance(DeleteScheduleEntryQueryDto, {}).notify).toBe(true);
    });
});
