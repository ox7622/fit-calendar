import { BotSubscriber, type TBotSubscriberSource } from '@fitcalendar/db';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

export interface IUpsertSubscriberInput {
    telegramId: number;
    firstName?: string | null;
    username?: string | null;
    source: TBotSubscriberSource;
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
                username: input.username ?? null,
                source: input.source,
                isActive: true,
            },
            ['telegramId'],
        );
    }

    async deactivate(telegramId: number): Promise<void> {
        await this.repo.update({ telegramId }, { isActive: false });
    }

    /** Active broadcast audience: telegram ids of every subscriber who hasn't opted out. */
    async findActiveRecipients(): Promise<{ telegramId: number }[]> {
        const rows = await this.repo
            .createQueryBuilder('s')
            .select('s.telegramId', 'telegramId')
            .where('s.isActive = true')
            .getRawMany<{ telegramId: string }>();
        return rows.map((r) => ({ telegramId: Number(r.telegramId) }));
    }
}
