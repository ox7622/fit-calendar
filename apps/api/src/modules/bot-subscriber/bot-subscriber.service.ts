import { BotSubscriber } from '@fitcalendar/db';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface IUpsertSubscriberInput {
    telegramId: number;
    firstName?: string | null;
}

@Injectable()
export class BotSubscriberService {
    constructor(
        @InjectRepository(BotSubscriber)
        private readonly repo: Repository<BotSubscriber>,
    ) {}

    /** Records a contact: inserts a new subscriber or refreshes + re-activates an existing one. */
    async upsert(input: IUpsertSubscriberInput): Promise<void> {
        await this.repo.upsert(
            {
                telegramId: input.telegramId,
                firstName: input.firstName ?? null,
                isActive: true,
            },
            ['telegramId'],
        );
    }

    async deactivate(telegramId: number): Promise<void> {
        await this.repo.update({ telegramId }, { isActive: false });
    }

    /** Active broadcast audience: telegram ids of every subscriber who hasn't opted out. */
    findActiveRecipients(): Promise<Pick<BotSubscriber, 'telegramId'>[]> {
        return this.repo.find({ where: { isActive: true }, select: { telegramId: true } });
    }
}
