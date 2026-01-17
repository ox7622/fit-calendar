import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

import type { IApiError } from '../http-exception.filter';
import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
    let filter: HttpExceptionFilter;
    let mockResponse: { status: jest.Mock; json: jest.Mock };
    let mockRequest: { url: string; method: string };
    let mockHost: ArgumentsHost;

    beforeEach(() => {
        filter = new HttpExceptionFilter();

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        mockRequest = {
            url: '/api/test',
            method: 'GET',
        };

        mockHost = {
            switchToHttp: jest.fn().mockReturnValue({
                getResponse: jest.fn().mockReturnValue(mockResponse),
                getRequest: jest.fn().mockReturnValue(mockRequest),
            }),
        } as unknown as ArgumentsHost;
    });

    it('should format HttpException correctly', () => {
        const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'Not found',
                path: '/api/test',
            }),
        );
    });

    it('should include timestamp in error response', () => {
        const exception = new HttpException('Error', HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockHost);

        const response = mockResponse.json.mock.calls[0][0] as IApiError;
        expect(response.timestamp).toBeDefined();
        expect(new Date(response.timestamp).toISOString()).toBe(response.timestamp);
    });

    it('should handle generic errors as 500 Internal Server Error', () => {
        const exception = new Error('Unexpected error');

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Internal server error',
                error: 'InternalServerError',
            }),
        );
    });

    it('should handle HttpException with object response', () => {
        const exception = new HttpException({ message: 'Validation failed', details: [] }, HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockHost);

        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Validation failed',
            }),
        );
    });

    it('should handle HttpException with array message', () => {
        const exception = new HttpException({ message: ['error1', 'error2'] }, HttpStatus.BAD_REQUEST);

        filter.catch(exception, mockHost);

        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'error1, error2',
            }),
        );
    });

    it('should handle different HTTP status codes', () => {
        const statuses = [
            HttpStatus.UNAUTHORIZED,
            HttpStatus.FORBIDDEN,
            HttpStatus.CONFLICT,
            HttpStatus.UNPROCESSABLE_ENTITY,
        ];

        statuses.forEach((status) => {
            const exception = new HttpException('Test error', status);
            filter.catch(exception, mockHost);
            expect(mockResponse.status).toHaveBeenCalledWith(status);
        });
    });
});
