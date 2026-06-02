import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { AdminAuthGuard } from '../admin-auth.guard';

const SECRET = 'test-jwt-secret-min-32-characters-aaaaaa';
const WRONG_SECRET = 'completely-different-secret-32-chars-bbb';

describe('AdminAuthGuard', () => {
    let guard: AdminAuthGuard;
    let jwtService: JwtService;
    const mockConfigService = {
        getOrThrow: jest.fn((key: string) => {
            if (key === 'JWT_SECRET') return SECRET;
            throw new Error(`unexpected key: ${key}`);
        }),
    } as unknown as ConfigService;

    beforeEach(() => {
        jwtService = new JwtService({ secret: SECRET, signOptions: { expiresIn: '24h' } });
        guard = new AdminAuthGuard(jwtService, mockConfigService);
    });

    function buildContext(authHeader: string | undefined): {
        ctx: ExecutionContext;
        request: { headers: Record<string, string | undefined>; admin?: unknown };
    } {
        const request: { headers: Record<string, string | undefined>; admin?: unknown } = {
            headers: { authorization: authHeader },
        };
        const ctx = {
            switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext;
        return { ctx, request };
    }

    describe('canActivate', () => {
        it('returns true and attaches request.admin on a valid token', async () => {
            const token = jwtService.sign({ sub: 'admin-1', email: 'admin@x.ru', name: 'Admin' });
            const { ctx, request } = buildContext(`Bearer ${token}`);

            const ok = await guard.canActivate(ctx);

            expect(ok).toBe(true);
            expect(request.admin).toEqual({ id: 'admin-1', email: 'admin@x.ru', name: 'Admin' });
        });

        it('throws UnauthorizedException when Authorization header is missing', async () => {
            const { ctx } = buildContext(undefined);

            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws UnauthorizedException when Authorization header lacks Bearer prefix', async () => {
            const { ctx } = buildContext('Basic abcdef');

            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws UnauthorizedException for an expired token', async () => {
            const expiredJwt = new JwtService({ secret: SECRET });
            const expiredToken = expiredJwt.sign(
                { sub: 'admin-1', email: 'admin@x.ru', name: 'Admin' },
                { expiresIn: -10 }, // already expired
            );
            const { ctx } = buildContext(`Bearer ${expiredToken}`);

            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws UnauthorizedException for a tampered token', async () => {
            const token = jwtService.sign({ sub: 'admin-1', email: 'admin@x.ru', name: 'Admin' });
            // Flip a character in the payload section to invalidate the signature.
            const parts = token.split('.');
            parts[1] = parts[1].slice(0, -1) + (parts[1].slice(-1) === 'a' ? 'b' : 'a');
            const tampered = parts.join('.');
            const { ctx } = buildContext(`Bearer ${tampered}`);

            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws UnauthorizedException for a token signed with the wrong secret', async () => {
            const otherJwt = new JwtService({ secret: WRONG_SECRET });
            const token = otherJwt.sign({ sub: 'admin-1', email: 'admin@x.ru', name: 'Admin' });
            const { ctx } = buildContext(`Bearer ${token}`);

            await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
        });
    });

    describe('constructor fail-fast', () => {
        it('throws if JWT_SECRET is missing in config', () => {
            const emptyConfig = {
                getOrThrow: jest.fn(() => {
                    throw new Error('JWT_SECRET is not configured');
                }),
            } as unknown as ConfigService;

            expect(() => new AdminAuthGuard(jwtService, emptyConfig)).toThrow('JWT_SECRET is not configured');
        });
    });
});
