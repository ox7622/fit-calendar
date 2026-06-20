import { PartialType } from '@nestjs/swagger';

import { CreateScheduleEntryDto } from './create-schedule-entry.dto';

/**
 * PUT body. All four fields can change. Front-end always sends all four, but
 * we accept partial bodies for resilience. **Note:** `status` is intentionally
 * not part of this DTO — cancellation goes through the Story 6.4 endpoint so
 * the cancellation-notification side-effect runs. `forbidNonWhitelisted` (set
 * globally in main.ts) means a stray `status` in the body 400s.
 */
export class UpdateScheduleEntryDto extends PartialType(CreateScheduleEntryDto) {}
