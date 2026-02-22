# 7. External APIs

## 7.1 Telegram Bot API

**Purpose:** Bot commands, notifications, Mini App launch

**Integration:**

```typescript
// grammY bot setup
import { Bot } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// Webhook mode for production
bot.api.setWebhook(`${DOMAIN}/api/bot/webhook`);
```

**Key Methods Used:**
| Method | Purpose |
|--------|---------|
| `sendMessage` | Reminder notifications |
| `answerCallbackQuery` | Inline button responses |
| `setWebhook` | Register webhook URL |
| `getMe` | Verify bot connection |

**Bot Commands:**
| Command | Description |
|---------|-------------|
| `/start` | Welcome + Mini App button |
| `/schedule` | Today's classes (inline) |
| `/reminders` | Active reminders list |
| `/help` | Command reference |

## 7.2 Telegram WebApp SDK

**Purpose:** Mini App authentication, native features

**Integration:**

```typescript
// Frontend initialization
import WebApp from '@twa-dev/sdk';

WebApp.ready();
WebApp.expand();

// Get init data for API auth
const initData = WebApp.initData;

// Theme sync
const colorScheme = WebApp.colorScheme; // 'dark' | 'light'
```

**Features Used:**
| Feature | Purpose |
|---------|---------|
| `initData` | User authentication |
| `colorScheme` | Theme detection |
| `MainButton` | Primary CTA |
| `BackButton` | Navigation |
| `HapticFeedback` | Touch feedback |
| `openLink` | External links |

## 7.3 Cloudinary API

**Purpose:** Coach photo storage and optimization

**Integration:**

```typescript
// Backend upload
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload with transformations
const result = await cloudinary.uploader.upload(file.path, {
    folder: 'fitcalendar/coaches',
    transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' },
    ],
});
```

**Transformations:**
| Use Case | Transformation |
|----------|----------------|
| Coach avatar (list) | 100x100, face crop |
| Coach profile | 400x400, face crop |
| Thumbnail | 50x50, face crop |

## 7.4 Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fitcalendar

# JWT
JWT_SECRET=xxx
JWT_EXPIRES_IN=7d

# App
NODE_ENV=production
API_URL=https://api.fitcalendar.ru
```

---
