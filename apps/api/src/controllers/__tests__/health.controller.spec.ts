import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { HealthController } from '../health.controller';

describe('HealthController', () => {
    let controller: HealthController;
    let dataSource: jest.Mocked<DataSource>;

    beforeEach(async () => {
        const mockDataSource = {
            query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HealthController],
            providers: [
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        controller = module.get<HealthController>(HealthController);
        dataSource = module.get(DataSource);
    });

    describe('check', () => {
        it('should return health status with status ok', () => {
            const result = controller.check();

            expect(result.status).toBe('ok');
        });

        it('should return health status with timestamp', () => {
            const result = controller.check();

            expect(result.timestamp).toBeDefined();
            expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
        });

        it('should return health status with uptime', () => {
            const result = controller.check();

            expect(result.uptime).toBeDefined();
            expect(typeof result.uptime).toBe('number');
            expect(result.uptime).toBeGreaterThanOrEqual(0);
        });
    });

    describe('ready', () => {
        it('should return ready status when database responds', async () => {
            const result = await controller.ready();

            expect(result.status).toBe('ready');
        });

        it('should call database query to check connection', async () => {
            await controller.ready();

            expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
        });

        it('should throw error when database is not available', async () => {
            dataSource.query.mockRejectedValueOnce(new Error('Connection failed'));

            await expect(controller.ready()).rejects.toThrow('Connection failed');
        });
    });
});
