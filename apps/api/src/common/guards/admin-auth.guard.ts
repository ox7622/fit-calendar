import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface IAdminUserContext {
    id: string;
    login: string;
    name: string;
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        interface Request {
            admin?: IAdminUserContext;
        }
    }
}

interface IAdminTokenPayload {
    sub: string;
    login: string;
    name: string;
}

@Injectable()
export class AdminAuthGuard implements CanActivate {
    private readonly logger = new Logger(AdminAuthGuard.name);
    private readonly jwtSecret: string;

    constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {
        this.jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.logger.debug('Missing or malformed Authorization header');
            throw new UnauthorizedException();
        }

        const token = authHeader.slice(7);

        try {
            const payload = await this.jwtService.verifyAsync<IAdminTokenPayload>(token, {
                secret: this.jwtSecret,
            });
            request.admin = { id: payload.sub, login: payload.login, name: payload.name };
            return true;
        } catch (err) {
            this.logger.debug(`Invalid admin token: ${(err as Error).message}`);
            throw new UnauthorizedException();
        }
    }
}
