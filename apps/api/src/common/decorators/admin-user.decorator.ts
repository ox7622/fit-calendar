import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

import type { IAdminUserContext } from '../guards/admin-auth.guard';

/**
 * Parameter decorator to extract the authenticated admin user from the request.
 * Must be used in routes guarded by `AdminAuthGuard` — without the guard the
 * decorator returns `undefined`.
 *
 * @example
 * ```typescript
 * @Get('me')
 * @UseGuards(AdminAuthGuard)
 * getMe(@AdminUser() admin: IAdminUserContext) {
 *   return admin;
 * }
 * ```
 */
export const AdminUser = createParamDecorator(
    (data: keyof IAdminUserContext | undefined, ctx: ExecutionContext): IAdminUserContext | unknown => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const admin = request.admin;

        if (!admin) {
            return undefined;
        }

        if (data) {
            return admin[data];
        }

        return admin;
    },
);
