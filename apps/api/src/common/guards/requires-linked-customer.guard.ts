import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Story 7.2 — sits *after* `TelegramAuthGuard` at the method level on routes
 * that require a linked customer record (reminders, profile, settings, etc.).
 *
 * Returns 403 + machine code `CUSTOMER_NOT_LINKED` when the calling Telegram
 * identity has no matching customer. Distinct from 401 (which means "we don't
 * know who you are"): here we know you, you're just not on the member list.
 *
 * The Mini App reads the machine code (not the human message) to decide
 * whether to show the LinkPhonePrompt.
 */
@Injectable()
export class RequiresLinkedCustomer implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        if (!request.customer) {
            throw new ForbiddenException({
                statusCode: 403,
                error: 'Forbidden',
                message: 'Customer not linked',
                code: 'CUSTOMER_NOT_LINKED',
            });
        }
        return true;
    }
}
