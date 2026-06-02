# Деплой на VPS (Россия) — Docker Compose + Caddy

Один сервер поднимает всё: **Postgres + API (вебхук-бот внутри) + Caddy** (авто-HTTPS,
раздаёт Mini App и Admin, проксирует API). Оплата российской картой/СБП. Ветка — `develop`.

Артефакты в репо: `docker/docker-compose.prod.yml`, `docker/Dockerfile.prod-api`,
`docker/Dockerfile.frontends`, `docker/Caddyfile`, `.env.prod.example`.

Заготовь секреты:
```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # TELEGRAM_WEBHOOK_SECRET
# TELEGRAM_BOT_TOKEN — из .env.local / @BotFather
```

---

## ШАГ 1 — Домен (~200 ₽/год)
Telegram (Mini App + вебхук) требует HTTPS с валидным сертификатом → нужен домен.
1. Купи `.ru` домен (reg.ru / timeweb.com / beget.com) — оплата российской картой.
2. DNS пока не трогай — настроим после создания VPS (шаг 3).

## ШАГ 2 — VPS (~200 ₽/мес)
1. Создай сервер на **Timeweb Cloud** или **Selectel**: образ **Ubuntu 24.04**,
   1–2 ГБ RAM (для сборки лучше 2 ГБ), оплата картой/СБП.
2. Запиши **публичный IP** и root-доступ (пароль или SSH-ключ).

## ШАГ 3 — DNS
В панели домена добавь **A-записи** на IP сервера:
```
api    A  <IP>
app    A  <IP>
admin  A  <IP>
```
Проверь: `dig +short api.<домен>` → IP. (Подождать распространения 5–30 мин.)

## ШАГ 4 — Подготовка сервера
Подключись по SSH (`ssh root@<IP>`) и поставь Docker:
```bash
curl -fsSL https://get.docker.com | sh
# открыть порты, если есть ufw:
ufw allow 80 && ufw allow 443 && ufw allow OpenSSH && ufw --force enable
```

## ШАГ 5 — Код + переменные
```bash
git clone -b develop https://github.com/ox7622/fit-calendar.git
cd fit-calendar
cp .env.prod.example .env.prod
nano .env.prod   # заполни DOMAIN, ACME_EMAIL, NX_DB_PASS, JWT_SECRET, токены, YANDEX_GEOCODER_API_KEY
```

## ШАГ 6 — Запуск
```bash
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d --build
```
Первая сборка идёт несколько минут (ставит зависимости, собирает API + фронты).
Caddy сам получит HTTPS-сертификаты для трёх поддоменов.

Проверь логи:
```bash
docker compose -f docker/docker-compose.prod.yml logs -f api
# ищи: "Bot @… initialized" и "Webhook registered at …/api/bot/webhook"
```

## ШАГ 7 — BotFather
В **@BotFather**: `/mybots` → бот → **Bot Settings → Configure Mini App / Domain**
→ впиши `app.<домен>`. Меню команд и кнопку «Меню» бот ставит сам.
Проверка: `curl "https://api.telegram.org/bot<ТОКЕН>/getWebhookInfo"`.

## ШАГ 8 — Админ + проверка
- Миграции накатились автоматически. **Не** запускай `db:seed` (демо-данные + `admin123`).
- Создай своего админа:
  ```bash
  docker compose -f docker/docker-compose.prod.yml exec api \
    node -e "console.log(require('bcrypt').hashSync('ТВОЙ_ПАРОЛЬ',10))"
  docker compose -f docker/docker-compose.prod.yml exec postgres \
    psql -U fitcalendar -d fitcalendar -c \
    "INSERT INTO admin_users (email,\"passwordHash\",name,\"isActive\") VALUES ('you@mail','<хэш>','Admin',true);"
  ```
- Проверка: `https://api.<домен>/api/schedule/today` → JSON; бот `/start` `/today` `/club`;
  открой Mini App кнопкой «Меню»; зайди в `https://admin.<домен>` → Клуб → «Определить по адресу».

---

## Обновление после изменений в коде
```bash
cd fit-calendar && git pull
docker compose --env-file .env.prod -f docker/docker-compose.prod.yml up -d --build
```

## Если что-то споткнётся
- **Сертификат не выдаётся:** DNS ещё не указывает на IP, или закрыты порты 80/443. Проверь `dig` и `ufw`.
- **API не стартует:** `docker compose ... logs api` — обычно не хватает переменной в `.env.prod`.
- **Бот молчит:** `getWebhookInfo` — если `last_error_message` не пуст, смотри логи api.
- **Мало RAM на сборке:** возьми сервер 2 ГБ или добавь swap (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`).
