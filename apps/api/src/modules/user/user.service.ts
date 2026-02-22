import { User } from '@fitcalendar/db';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ITelegramUserData } from '../../common/guards/telegram-auth.guard';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    /**
     * Find user by Telegram ID
     */
    async findByTelegramId(telegramId: number): Promise<User | null> {
        return this.userRepository.findOne({ where: { telegramId } });
    }

    /**
     * Create or update user from Telegram data
     * Called on each Mini App open to keep user data fresh
     */
    async upsert(telegramData: ITelegramUserData): Promise<User> {
        const existingUser = await this.findByTelegramId(telegramData.id);

        if (existingUser) {
            // Update existing user with fresh data
            existingUser.firstName = telegramData.first_name;
            existingUser.lastName = telegramData.last_name ?? null;
            existingUser.username = telegramData.username ?? null;

            this.logger.log(`Updating user: ${telegramData.id}`);
            return this.userRepository.save(existingUser);
        }

        // Create new user
        const newUser = this.userRepository.create({
            telegramId: telegramData.id,
            firstName: telegramData.first_name,
            lastName: telegramData.last_name ?? null,
            username: telegramData.username ?? null,
            reminderMinutes: 30, // Default reminder time
        });

        this.logger.log(`Creating new user: ${telegramData.id}`);
        return this.userRepository.save(newUser);
    }

    /**
     * Get user by Telegram ID, creating if necessary
     */
    async getOrCreate(telegramData: ITelegramUserData): Promise<User> {
        return this.upsert(telegramData);
    }

    /**
     * Update user's reminder preferences
     */
    async updateReminderMinutes(userId: string, minutes: number): Promise<User | null> {
        const user = await this.findById(userId);
        if (!user) {
            return null;
        }

        user.reminderMinutes = minutes;
        return this.userRepository.save(user);
    }
}
