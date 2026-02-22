import { User } from '@fitcalendar/db';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import type { ITelegramUserData } from '../../../common/guards/telegram-auth.guard';
import { UserService } from '../user.service';

describe('UserService', () => {
    let service: UserService;
    let mockRepository: jest.Mocked<Repository<User>>;

    const mockTelegramUser: ITelegramUserData = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        language_code: 'en',
    };

    const mockUser: User = {
        id: 'uuid-1234',
        telegramId: 123456789,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
        reminders: [],
    };

    beforeEach(async () => {
        mockRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        } as unknown as jest.Mocked<Repository<User>>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<UserService>(UserService);
    });

    describe('findById', () => {
        it('should return user if found', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findById('uuid-1234');

            expect(result).toEqual(mockUser);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: 'uuid-1234' },
            });
        });

        it('should return null if user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.findById('non-existent');

            expect(result).toBeNull();
        });
    });

    describe('findByTelegramId', () => {
        it('should return user if found', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findByTelegramId(123456789);

            expect(result).toEqual(mockUser);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { telegramId: 123456789 },
            });
        });

        it('should return null if user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.findByTelegramId(999999999);

            expect(result).toBeNull();
        });
    });

    describe('upsert', () => {
        it('should create new user if not exists', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(mockUser);
            mockRepository.save.mockResolvedValue(mockUser);

            const result = await service.upsert(mockTelegramUser);

            expect(result).toEqual(mockUser);
            expect(mockRepository.create).toHaveBeenCalledWith({
                telegramId: mockTelegramUser.id,
                firstName: mockTelegramUser.first_name,
                lastName: mockTelegramUser.last_name,
                username: mockTelegramUser.username,
                reminderMinutes: 30,
            });
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should update existing user', async () => {
            const existingUser = { ...mockUser };
            mockRepository.findOne.mockResolvedValue(existingUser);
            mockRepository.save.mockResolvedValue(existingUser);

            const updatedTelegramUser: ITelegramUserData = {
                ...mockTelegramUser,
                first_name: 'Jane',
                last_name: 'Smith',
            };

            const result = await service.upsert(updatedTelegramUser);

            expect(result.firstName).toBe('Jane');
            expect(result.lastName).toBe('Smith');
            expect(mockRepository.create).not.toHaveBeenCalled();
            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    firstName: 'Jane',
                    lastName: 'Smith',
                }),
            );
        });

        it('should handle null optional fields', async () => {
            mockRepository.findOne.mockResolvedValue(null);
            mockRepository.create.mockReturnValue(mockUser);
            mockRepository.save.mockResolvedValue(mockUser);

            const telegramUserNoOptionals: ITelegramUserData = {
                id: 123456789,
                first_name: 'John',
            };

            await service.upsert(telegramUserNoOptionals);

            expect(mockRepository.create).toHaveBeenCalledWith({
                telegramId: 123456789,
                firstName: 'John',
                lastName: null,
                username: null,
                reminderMinutes: 30,
            });
        });
    });

    describe('getOrCreate', () => {
        it('should call upsert', async () => {
            mockRepository.findOne.mockResolvedValue(mockUser);
            mockRepository.save.mockResolvedValue(mockUser);

            const result = await service.getOrCreate(mockTelegramUser);

            expect(result).toEqual(mockUser);
        });
    });

    describe('updateReminderMinutes', () => {
        it('should update reminder minutes for existing user', async () => {
            const existingUser = { ...mockUser };
            mockRepository.findOne.mockResolvedValue(existingUser);
            mockRepository.save.mockImplementation(async (user) => user as User);

            const result = await service.updateReminderMinutes('uuid-1234', 60);

            expect(result?.reminderMinutes).toBe(60);
            expect(mockRepository.save).toHaveBeenCalled();
        });

        it('should return null if user not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            const result = await service.updateReminderMinutes('non-existent', 60);

            expect(result).toBeNull();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });
});
