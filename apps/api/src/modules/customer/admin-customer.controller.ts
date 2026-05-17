import {
    BadRequestException,
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AdminAuthGuard } from '../../common/guards/admin-auth.guard';

import { CustomerImportService } from './customer-import.service';
import { CustomerService, InvalidPhoneFormatError } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerResponseDto, toCustomerResponse } from './dto/customer-response.dto';
import { ImportPreviewDto, ImportResultDto } from './dto/import-preview.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

export class CustomerListResponseDto {
    items: CustomerResponseDto[];
    total: number;
    page: number;
    pageSize: number;
}

const MAX_CSV_BYTES = 5 * 1024 * 1024;

@ApiTags('Admin Customers')
@ApiBearerAuth()
@Controller('admin/customers')
@UseGuards(AdminAuthGuard)
export class AdminCustomerController {
    constructor(
        private readonly customerService: CustomerService,
        private readonly customerImportService: CustomerImportService,
        @InjectDataSource() private readonly dataSource: DataSource,
    ) {}

    @Get()
    @ApiOperation({ summary: 'Paginated list with search + filters' })
    @ApiQuery({
        name: 'search',
        required: false,
        description: 'matches firstName / lastName / phone / telegramUsername',
    })
    @ApiQuery({ name: 'isActive', required: false, type: Boolean })
    @ApiQuery({ name: 'linkedOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'pageSize', required: false, type: Number })
    @ApiResponse({ status: 200, type: CustomerListResponseDto })
    @ApiResponse({ status: 401 })
    async findAll(
        @Query('search') search?: string,
        @Query('isActive') isActive?: string,
        @Query('linkedOnly') linkedOnly?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ): Promise<CustomerListResponseDto> {
        const result = await this.customerService.findAll({
            search,
            isActive: parseBool(isActive),
            linkedOnly: parseBool(linkedOnly) ?? false,
            page: page ? parseInt(page, 10) : undefined,
            pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
        });
        return {
            items: result.items.map(toCustomerResponse),
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by id' })
    @ApiResponse({ status: 200, type: CustomerResponseDto })
    @ApiResponse({ status: 404 })
    async findById(@Param('id', new ParseUUIDPipe()) id: string): Promise<CustomerResponseDto> {
        const customer = await this.customerService.findById(id);
        if (!customer) {
            throw new NotFoundException(`Customer ${id} not found`);
        }
        return toCustomerResponse(customer);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new customer (phone normalized + uniqueness-checked)' })
    @ApiResponse({ status: 201, type: CustomerResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid phone format or other validation failure' })
    @ApiResponse({ status: 409, description: 'Phone or telegramId already in use' })
    async create(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
        try {
            const customer = await this.customerService.create(dto);
            return toCustomerResponse(customer);
        } catch (err) {
            throw mapServiceError(err);
        }
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update a customer' })
    @ApiResponse({ status: 200, type: CustomerResponseDto })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 400 })
    @ApiResponse({ status: 409 })
    async update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateCustomerDto,
    ): Promise<CustomerResponseDto> {
        try {
            const updated = await this.customerService.update(id, dto);
            if (!updated) {
                throw new NotFoundException(`Customer ${id} not found`);
            }
            return toCustomerResponse(updated);
        } catch (err) {
            throw mapServiceError(err);
        }
    }

    @Post(':id/unlink')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Clear the customer’s Telegram identity (allows re-link from a new account)' })
    @ApiResponse({ status: 200, type: CustomerResponseDto })
    @ApiResponse({ status: 404 })
    async unlink(@Param('id', new ParseUUIDPipe()) id: string): Promise<CustomerResponseDto> {
        const updated = await this.customerService.unlinkTelegram(id);
        if (!updated) {
            throw new NotFoundException(`Customer ${id} not found`);
        }
        return toCustomerResponse(updated);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a customer (only if no reminders / memberships)' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 404 })
    @ApiResponse({ status: 409, description: 'Customer has dependent records' })
    async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
        const result = await this.customerService.deleteCustomer(id);
        if (result === 'not_found') {
            throw new NotFoundException(`Customer ${id} not found`);
        }
        if (result === 'has_dependencies') {
            throw new ConflictException(
                'У клиента есть напоминания или абонементы. Удаление невозможно — деактивируйте профиль.',
            );
        }
    }

    @Post('import')
    @ApiOperation({
        summary: 'Bulk import customers from CSV (dry-run by default, ?commit=true to apply)',
        description:
            'Dry-run returns a planning preview without writing. Add ?commit=true to actually upsert. ' +
            'Upsert key is the normalized phone. Required columns: firstName, phone. Optional: ' +
            'lastName, email, telegramUsername, notes. Max file size 5MB / 5000 rows.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiQuery({ name: 'commit', required: false, description: 'literal "true" to apply, otherwise dry-run' })
    @ApiResponse({ status: 200, type: ImportPreviewDto, description: 'dry-run result' })
    @ApiResponse({ status: 201, type: ImportResultDto, description: 'commit applied' })
    @ApiResponse({ status: 400, description: 'Missing/invalid file, > 5000 rows, or unparseable CSV' })
    @ApiResponse({ status: 413, description: 'File exceeds 5MB' })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_CSV_BYTES } }))
    async importCsv(
        @UploadedFile() file: Express.Multer.File,
        @Query('commit') commit?: string,
    ): Promise<ImportPreviewDto | ImportResultDto> {
        if (!file) throw new BadRequestException('Файл не загружен');
        if (file.size === 0) throw new BadRequestException('Файл пустой');

        const plan = await this.customerImportService.parseAndValidate(file.buffer);

        if (commit !== 'true') {
            return {
                rowsTotal: plan.rowsTotal,
                rowsToCreate: plan.rowsToCreate,
                rowsToUpdate: plan.rowsToUpdate,
                rowsToSkip: plan.rowsToSkip,
                errors: plan.errors,
            };
        }

        const result = await this.dataSource.transaction((manager) =>
            this.customerImportService.commit(plan.plannedRows, manager),
        );
        return {
            created: result.created,
            updated: result.updated,
            skipped: plan.rowsToSkip,
            errors: plan.errors,
        };
    }
}

function parseBool(value: string | undefined): boolean | undefined {
    if (value === undefined) return undefined;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return undefined;
}

function mapServiceError(err: unknown): Error {
    if (err instanceof InvalidPhoneFormatError) {
        return new BadRequestException({
            statusCode: 400,
            error: 'Bad Request',
            code: 'INVALID_PHONE_FORMAT',
            message: 'Неверный формат номера. Пример: +7 999 555 12 34.',
        });
    }
    if (isUniqueViolation(err)) {
        return new ConflictException({
            statusCode: 409,
            error: 'Conflict',
            message: 'Этот номер или Telegram ID уже используется другим клиентом.',
        });
    }
    return err as Error;
}

function isUniqueViolation(err: unknown): boolean {
    return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === '23505';
}
