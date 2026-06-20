import type { Customer } from '@fitcalendar/db';
import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
    @ApiProperty() id: string;
    @ApiProperty() firstName: string;
    @ApiProperty({ nullable: true }) lastName: string | null;
    @ApiProperty({ example: '+74951234567' }) phone: string;
    @ApiProperty({ nullable: true }) email: string | null;
    @ApiProperty({ nullable: true, type: String }) telegramId: string | null;
    @ApiProperty({ nullable: true }) telegramUsername: string | null;
    @ApiProperty() isActive: boolean;
    @ApiProperty({ nullable: true }) notes: string | null;
    @ApiProperty() reminderMinutes: number;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
    @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
}

/**
 * `telegramId` is bigint in Postgres and comes back as a string from TypeORM
 * (driver setting). Serialize as string for JSON safety regardless.
 */
export function toCustomerResponse(customer: Customer): CustomerResponseDto {
    return {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        telegramId: customer.telegramId === null ? null : String(customer.telegramId),
        telegramUsername: customer.telegramUsername,
        isActive: customer.isActive,
        notes: customer.notes,
        reminderMinutes: customer.reminderMinutes,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
    };
}
