import type { Customer as CustomerEntity } from '@fitcalendar/db';
import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Returns the linked Customer record for the calling Telegram identity.
 * `null` when the caller hasn't linked yet (anonymous-OK routes).
 * Customer-required routes should additionally apply `RequiresLinkedCustomer`
 * so this decorator never returns null in their handler bodies.
 */
export const Customer = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CustomerEntity | null | undefined => {
        const request = ctx.switchToHttp().getRequest<Request>();
        return request.customer;
    },
);
