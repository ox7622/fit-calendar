# 11. Backend Architecture

## 11.1 NestJS Module Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   └── telegram-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── telegram-auth.guard.ts
│   │   │   └── jwt-auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   ├── modules/
│   │   ├── schedule/
│   │   │   ├── schedule.module.ts
│   │   │   ├── schedule.controller.ts
│   │   │   ├── schedule.service.ts
│   │   │   └── dto/
│   │   ├── coach/
│   │   ├── reminder/
│   │   ├── notification/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── bot/
│   │   ├── admin/
│   │   ├── club-info/
│   │   └── training-type/
│   └── config/
│       ├── database.config.ts
│       └── telegram.config.ts
└── test/
```

## 11.2 Telegram Auth Guard

```typescript
// common/guards/telegram-auth.guard.ts
@Injectable()
export class TelegramAuthGuard implements CanActivate {
    constructor(private userService: UserService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const initData = request.headers['x-telegram-init-data'];

        if (!initData) {
            throw new UnauthorizedException('Missing Telegram init data');
        }

        // Validate initData signature
        const isValid = this.validateInitData(initData);
        if (!isValid) {
            throw new UnauthorizedException('Invalid Telegram init data');
        }

        // Parse user data and attach to request
        const userData = this.parseInitData(initData);
        request.telegramUser = await this.userService.upsert(userData);

        return true;
    }

    private validateInitData(initData: string): boolean {
        // HMAC-SHA256 validation per Telegram docs
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        const dataCheckString = [...params.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');

        const secretKey = createHmac('sha256', 'WebAppData').update(process.env.TELEGRAM_BOT_TOKEN).digest();

        const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        return hash === calculatedHash;
    }
}
```

## 11.3 Reminder Scheduler

```typescript
// modules/notification/notification.service.ts
@Injectable()
export class NotificationService {
    constructor(private reminderRepo: ReminderRepository, private botService: BotService, private logger: Logger) {}

    @Cron('* * * * *') // Every minute
    async processReminders() {
        const pendingReminders = await this.reminderRepo.findPending();

        for (const reminder of pendingReminders) {
            try {
                await this.sendReminder(reminder);
                await this.reminderRepo.markSent(reminder.id);
            } catch (error) {
                this.logger.error(`Failed to send reminder ${reminder.id}`, error);
                await this.reminderRepo.markFailed(reminder.id);
            }
        }
    }

    private async sendReminder(reminder: Reminder) {
        const message = this.formatReminderMessage(reminder);
        await this.botService.sendMessage(reminder.user.telegramId, message, { parse_mode: 'HTML' });
    }
}
```

---
