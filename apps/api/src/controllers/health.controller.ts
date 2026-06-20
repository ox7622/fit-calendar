import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

interface IHealthResponse {
    status: string;
    timestamp: string;
    uptime: number;
}

interface IReadyResponse {
    status: string;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly dataSource: DataSource) {}

    @Get()
    @ApiOperation({ summary: 'Check API health status' })
    @ApiResponse({
        status: 200,
        description: 'API is healthy',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ok' },
                timestamp: { type: 'string', example: '2026-01-18T10:00:00.000Z' },
                uptime: { type: 'number', example: 123.456 },
            },
        },
    })
    check(): IHealthResponse {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    }

    @Get('ready')
    @ApiOperation({ summary: 'Check if API is ready (database connected)' })
    @ApiResponse({
        status: 200,
        description: 'API is ready',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'ready' },
            },
        },
    })
    @ApiResponse({
        status: 503,
        description: 'API is not ready (database connection failed)',
    })
    async ready(): Promise<IReadyResponse> {
        await this.dataSource.query('SELECT 1');
        return { status: 'ready' };
    }
}
