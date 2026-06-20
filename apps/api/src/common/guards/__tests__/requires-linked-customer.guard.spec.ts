import type { Customer } from '@fitcalendar/db';
import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';

import { RequiresLinkedCustomer } from '../requires-linked-customer.guard';

describe('RequiresLinkedCustomer', () => {
    const guard = new RequiresLinkedCustomer();

    function ctx(customer: Customer | null | undefined): ExecutionContext {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ customer }),
            }),
        } as ExecutionContext;
    }

    it('returns true when a linked customer is present', () => {
        const customer = { id: 'cust-1' } as Customer;
        expect(guard.canActivate(ctx(customer))).toBe(true);
    });

    it('throws 403 with code CUSTOMER_NOT_LINKED when customer is null', () => {
        try {
            guard.canActivate(ctx(null));
            fail('expected ForbiddenException');
        } catch (err) {
            expect(err).toBeInstanceOf(ForbiddenException);
            const response = (err as ForbiddenException).getResponse() as {
                statusCode: number;
                code: string;
                message: string;
            };
            expect(response.statusCode).toBe(403);
            expect(response.code).toBe('CUSTOMER_NOT_LINKED');
            expect(response.message).toBe('Customer not linked');
        }
    });

    it('throws 403 when customer is undefined (Telegram auth not yet run)', () => {
        expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
    });
});
