import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

export interface IApiError {
    statusCode: number;
    message: string;
    error: string;
    timestamp: string;
    path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const statusCode =
            exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const message = exception instanceof HttpException ? this.extractMessage(exception) : 'Internal server error';

        const error = exception instanceof HttpException ? exception.name || 'Error' : 'InternalServerError';

        const apiError: IApiError = {
            statusCode,
            message,
            error,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        this.logger.error(
            `${request.method} ${request.url} ${statusCode} - ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        response.status(statusCode).json(apiError);
    }

    private extractMessage(exception: HttpException): string {
        const response = exception.getResponse();
        if (typeof response === 'string') {
            return response;
        }
        if (typeof response === 'object' && response !== null) {
            const responseObj = response as Record<string, unknown>;
            if (typeof responseObj.message === 'string') {
                return responseObj.message;
            }
            if (Array.isArray(responseObj.message)) {
                return responseObj.message.join(', ');
            }
        }
        return exception.message;
    }
}
