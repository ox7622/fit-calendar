import { Customer } from '@fitcalendar/db';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { parse } from 'papaparse';
import { EntityManager, In, Repository } from 'typeorm';

import { normalizeRussianPhone } from '../../common/utils/phone';

import { IImportError, IPlannedRow } from './dto/import-preview.dto';

const REQUIRED_COLUMNS = ['firstName', 'phone'] as const;

const MAX_ROWS = 5000;

const UTF8_BOM = '﻿';

export interface IImportPlan {
    rowsTotal: number;
    rowsToCreate: number;
    rowsToUpdate: number;
    rowsToSkip: number;
    plannedRows: IPlannedRow[];
    errors: IImportError[];
}

interface IParsedCsvRow {
    [key: string]: string | undefined;
}

@Injectable()
export class CustomerImportService {
    private readonly logger = new Logger(CustomerImportService.name);

    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
    ) {}

    /**
     * Story 7.3 — parse + classify every CSV row. Pure preview: no DB writes.
     * Returns the same shape regardless of `?commit=true` so the dry-run and
     * commit endpoints share the work; the controller decides whether to
     * call `commit()` afterwards.
     *
     * `rowsToSkip` counts every row excluded from import (errors + in-batch
     * duplicates), so `total = create + update + skip`. The `errors` array
     * gives the admin actionable context per row.
     */
    async parseAndValidate(buffer: Buffer): Promise<IImportPlan> {
        // Strip the UTF-8 BOM Excel adds to CSV exports — otherwise the first
        // header gets read as "<BOM>firstName" and the required-column check fails.
        let text = buffer.toString('utf-8');
        if (text.startsWith(UTF8_BOM)) {
            text = text.slice(UTF8_BOM.length);
        }

        const parsed = parse<IParsedCsvRow>(text, {
            header: true,
            delimiter: ',',
            skipEmptyLines: true,
            transformHeader: (h) => h.trim(),
        });

        // Only fatal/structural parse errors abort; "FieldMismatch" etc. are
        // per-row and we'd rather report them in the per-row errors below.
        const fatal = parsed.errors.find((e) => e.type === 'Quotes' || e.type === 'Delimiter');
        if (fatal) {
            throw new BadRequestException(`CSV не удалось разобрать: ${fatal.message} (строка ${fatal.row ?? '?'})`);
        }

        if (parsed.data.length > MAX_ROWS) {
            throw new BadRequestException(`Слишком много строк: ${parsed.data.length}. Максимум — ${MAX_ROWS}.`);
        }

        const errors: IImportError[] = [];
        const headers = parsed.meta.fields ?? [];

        // Header-level validation: required columns must be present.
        for (const col of REQUIRED_COLUMNS) {
            if (!headers.includes(col)) {
                errors.push({ row: 1, column: col, message: `Колонка "${col}" обязательна` });
            }
        }
        if (errors.length > 0) {
            // Without required headers there's nothing meaningful to plan.
            return {
                rowsTotal: parsed.data.length,
                rowsToCreate: 0,
                rowsToUpdate: 0,
                rowsToSkip: parsed.data.length,
                plannedRows: [],
                errors,
            };
        }

        // First pass: per-row validation + phone normalization. Records each
        // row's outcome separately from the existing-customer lookup so the
        // single bulk SQL query below covers all valid rows.
        type TStagedRow = {
            rowNumber: number;
            normalized?: IPlannedRow['normalized'];
        };
        const staged: TStagedRow[] = [];
        const phoneFirstSeenAt = new Map<string, number>();

        parsed.data.forEach((raw, index) => {
            const rowNumber = index + 2; // header is row 1
            const firstName = (raw.firstName ?? '').trim();
            const rawPhone = (raw.phone ?? '').trim();

            if (!firstName) {
                errors.push({ row: rowNumber, column: 'firstName', message: 'firstName не указан' });
                staged.push({ rowNumber });
                return;
            }
            if (!rawPhone) {
                errors.push({ row: rowNumber, column: 'phone', message: 'phone не указан' });
                staged.push({ rowNumber });
                return;
            }
            const normalizedPhone = normalizeRussianPhone(rawPhone);
            if (!normalizedPhone) {
                errors.push({
                    row: rowNumber,
                    column: 'phone',
                    message: `Неверный формат телефона: "${rawPhone}"`,
                });
                staged.push({ rowNumber });
                return;
            }
            const firstSeen = phoneFirstSeenAt.get(normalizedPhone);
            if (firstSeen !== undefined) {
                errors.push({
                    row: rowNumber,
                    column: 'phone',
                    message: `Дубликат телефона ${normalizedPhone} (впервые в строке ${firstSeen})`,
                });
                staged.push({ rowNumber });
                return;
            }
            phoneFirstSeenAt.set(normalizedPhone, rowNumber);

            staged.push({
                rowNumber,
                normalized: {
                    firstName,
                    lastName: optional(raw.lastName),
                    phone: normalizedPhone,
                    email: optional(raw.email),
                    telegramUsername: optional(raw.telegramUsername),
                    notes: optional(raw.notes),
                },
            });
        });

        // Single round-trip for existence: classify create vs update without
        // a query per row.
        const phonesToCheck = staged.map((s) => s.normalized?.phone).filter((p): p is string => typeof p === 'string');
        const existing =
            phonesToCheck.length === 0
                ? []
                : await this.customerRepo.find({
                      where: { phone: In(phonesToCheck) },
                      select: ['id', 'phone'],
                  });
        const existingByPhone = new Map(existing.map((c) => [c.phone, c.id]));

        const plannedRows: IPlannedRow[] = [];
        let rowsToCreate = 0;
        let rowsToUpdate = 0;
        for (const row of staged) {
            if (!row.normalized) continue; // already in errors[]
            const customerId = existingByPhone.get(row.normalized.phone);
            if (customerId) {
                plannedRows.push({
                    action: 'update',
                    rowNumber: row.rowNumber,
                    customerId,
                    normalized: row.normalized,
                });
                rowsToUpdate++;
            } else {
                plannedRows.push({ action: 'create', rowNumber: row.rowNumber, normalized: row.normalized });
                rowsToCreate++;
            }
        }

        return {
            rowsTotal: parsed.data.length,
            rowsToCreate,
            rowsToUpdate,
            rowsToSkip: parsed.data.length - rowsToCreate - rowsToUpdate,
            plannedRows,
            errors,
        };
    }

    /**
     * Story 7.3 — apply a previously-computed plan. Caller supplies the
     * transaction `EntityManager` so the controller can wrap the entire
     * batch in `dataSource.transaction(...)`. Updates preserve existing
     * `telegramId` / `telegramUsername` (when CSV omits it) by only writing
     * the columns that were actually provided.
     */
    async commit(plannedRows: IPlannedRow[], manager: EntityManager): Promise<{ created: number; updated: number }> {
        const repo = manager.getRepository(Customer);
        let created = 0;
        let updated = 0;
        for (const row of plannedRows) {
            if (row.action === 'create') {
                const customer = repo.create({
                    firstName: row.normalized.firstName,
                    lastName: row.normalized.lastName,
                    phone: row.normalized.phone,
                    email: row.normalized.email,
                    telegramUsername: row.normalized.telegramUsername,
                    notes: row.normalized.notes,
                    isActive: true,
                });
                await repo.save(customer);
                created++;
            } else if (row.action === 'update' && row.customerId) {
                // Only overwrite columns that the CSV actually carried.
                const patch: Partial<Customer> = { firstName: row.normalized.firstName };
                if (row.normalized.lastName !== null) patch.lastName = row.normalized.lastName;
                if (row.normalized.email !== null) patch.email = row.normalized.email;
                if (row.normalized.telegramUsername !== null) {
                    patch.telegramUsername = row.normalized.telegramUsername;
                }
                if (row.normalized.notes !== null) patch.notes = row.normalized.notes;
                await repo.update({ id: row.customerId }, patch);
                updated++;
            }
        }
        this.logger.log(`CSV import committed: ${created} created, ${updated} updated`);
        return { created, updated };
    }
}

function optional(value: string | undefined): string | null {
    if (value === undefined) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}
