import { ApiProperty } from '@nestjs/swagger';

export interface IImportError {
    row: number;
    column?: string;
    message: string;
}

export type TImportAction = 'create' | 'update' | 'skip';

export interface IPlannedRow {
    action: TImportAction;
    rowNumber: number;
    customerId?: string;
    normalized: {
        firstName: string;
        lastName: string | null;
        phone: string;
        email: string | null;
        telegramUsername: string | null;
        notes: string | null;
    };
}

export class ImportErrorDto {
    @ApiProperty() row: number;
    @ApiProperty({ required: false, type: String }) column?: string;
    @ApiProperty() message: string;
}

export class ImportPreviewDto {
    @ApiProperty() rowsTotal: number;
    @ApiProperty() rowsToCreate: number;
    @ApiProperty() rowsToUpdate: number;
    @ApiProperty() rowsToSkip: number;
    @ApiProperty({ type: [ImportErrorDto] }) errors: IImportError[];
}

export class ImportResultDto {
    @ApiProperty() created: number;
    @ApiProperty() updated: number;
    @ApiProperty() skipped: number;
    @ApiProperty({ type: [ImportErrorDto] }) errors: IImportError[];
}
