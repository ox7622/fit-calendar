# Мониторинг продакшена — пошаговая настройка

> Цель: знать о проблеме раньше клиента. Минимальный набор: UptimeRobot
> (доступность) + Sentry (ошибки) + Telegram-алерты бэкапа. Всё на free-тарифах,
> кода в репо не требует — только конфиг в их вебах + DSN'ы / endpoints в
> `.env.prod`.

## Что мониторим и где

| Что | Чем | Алерт куда | Цена |
|---|---|---|---|
| Доступность API | UptimeRobot | Telegram | Free |
| Ошибки бэка | Sentry (проект `api`) | Email + Slack | Free до 5k events/мес |
| Ошибки Mini App | Sentry (проект `mini-app`) | Email | Free (общий пул) |
| Ошибки Admin | Sentry (проект `admin`) | Email | Free (общий пул) |
| Бэкап БД упал | `backup.sh` → Telegram | Telegram | Free |
| Место на диске | uptimerobot HTTP keyword | Telegram | Free |

---

## 1. Sentry (один раз на всю компанию)

Sentry уже встроен в код — в проде включается передачей DSN'ов через
`install.sh`. Один раз настраиваешь organization + проекты, дальше каждой
новой инсталляции передаются те же DSN'ы (события тегируются `environment` и
`server_name`, клубы не путаются).

### 1.1. Завести organization
1. <https://sentry.io/signup/> — регистрация (Free Developer plan: 5k errors,
   10k performance units, 50 replays в месяц на всю организацию).
2. Создать организацию (имя — например, `fitcalendar`).

### 1.2. Создать три проекта
Один проект на слой = разные стектрейсы не смешиваются.

| Project name | Platform | Куда DSN |
|---|---|---|
| `fitcalendar-api` | Node.js → NestJS | `SENTRY_DSN` |
| `fitcalendar-mini-app` | JavaScript → React | `VITE_SENTRY_DSN_MINI` |
| `fitcalendar-admin` | JavaScript → React | `VITE_SENTRY_DSN_ADMIN` |

Для каждого: **Settings → Client Keys (DSN)** → копируем `DSN`.

### 1.3. Передать в install.sh
```bash
sudo bash install.sh \
  --domain club.ru ...прочие флаги... \
  --sentry-dsn-api    https://...@o123.ingest.sentry.io/N \
  --sentry-dsn-mini   https://...@o123.ingest.sentry.io/M \
  --sentry-dsn-admin  https://...@o123.ingest.sentry.io/K
```

### 1.4. Что настроить в каждом проекте
- **Alerts → New Alert Rule:**
  - Условие: «An issue is first seen» → Slack/Email.
  - Условие: «An event is seen more than 50 times in 5 minutes» → Telegram/Slack.
- **Settings → Environments:** убедиться, что `production` появляется после
  первого события. Прод-алерты — только для `production`.
- **Settings → Rate Limits:** на free-тарифе 5k events/мес. Поставить лимит
  на каждый DSN (например, 1k/час) — иначе один зацикленный баг сожжёт квоту
  и реальные ошибки потеряются.

### 1.5. Source maps (опционально, можно отложить)
Без source maps стектрейсы фронта показывают минифицированный код.
Включается через Sentry CLI на этапе сборки фронта в `Dockerfile.frontends`.
Делать имеет смысл, когда уже есть платящие клиенты и реальные баги от них.

---

## 2. UptimeRobot (на каждую инсталляцию)

5-минутный пинг `/api/health` снаружи + алерт в Telegram при недоступности.

### 2.1. Один раз настроить organization
1. <https://uptimerobot.com/signUp> — Free tier: 50 мониторов, 5-минутный
   интервал. Хватит на 50 клубов.
2. **My Settings → Add Alert Contact:**
   - Type: **Telegram** → следуй инструкции (привязать бота `@uptimerobot_bot`
     и chat_id). Можно отдельный групповой чат «Прод-алерты».
   - Также добавь Email как резерв.

### 2.2. На каждую новую инсталляцию клуба
**Dashboard → + New Monitor:**
- Monitor Type: **HTTPS**
- Friendly Name: `<club-slug> API`
- URL: `https://api.<domain>/api/health`
- Monitoring Interval: 5 минут (на free-тарифе короче нельзя)
- Alert Contacts: Telegram + Email
- **Optional → Keyword Monitoring:**
  - Keyword: `"status":"ok"` (или что вернёт health-controller — см. ниже)
  - Alert When: Keyword **Not Exists**

> Зачем keyword: чисто HTTP 200 не доказывает что API живой —
> Caddy может вернуть 200 на стейл-страницу. Проверка тела защищает от этого.

Дополнительные мониторы (по желанию):
- `https://app.<domain>` → проверяет, что Mini App-бандл раздаётся.
- `https://admin.<domain>` → проверяет админку.
- TCP-monitor на `<IP>:443` → проверяет, что сертификат не протух (если
  Caddy зацепится с продлением, https-мониторы упадут одновременно).

### 2.3. Что отвечает /api/health
Контроллер в `apps/api/src/controllers/health.controller.ts`. По умолчанию
отдаёт `status`, `timestamp`, `uptime`. Если будешь полагаться на keyword —
не меняй формат не сообщив всем (иначе UptimeRobot начнёт ложно сыпать алерты
после деплоя). Закрепи контракт `/health` тестом — он уже есть в
`apps/api/src/controllers/__tests__/health.controller.spec.ts`.

---

## 3. Алерт бэкапа (уже встроен в backup.sh)

Файл `scripts/backup.sh` шлёт `❌ Backup FAILED ...` в Telegram при любом
падении. Настройка — в `/etc/fit-calendar-backup.env`:

```bash
BACKUP_ALERT_BOT_TOKEN=<отдельный бот для алертов, НЕ клиентский>
BACKUP_ALERT_CHAT_ID=<твой chat_id>
BACKUP_ALERT_ON_SUCCESS=0   # 1 = пинговать и при успехе (раз в день — норм)
```

Тест: руками положить рядом сломанный `INSTALL_DIR` или `chmod 000 /var/backups`
и запустить `backup.sh` — должен прилететь алерт.

### Завести служебного бота для алертов
1. @BotFather → `/newbot` → имя `fitcalendar-alerts-bot`.
2. Достать `chat_id`: написать боту любое сообщение, открыть
   `https://api.telegram.org/bot<TOKEN>/getUpdates`, найти `chat.id`.
3. **Не** использовать клиентского бота клуба — иначе клиент увидит алерты
   в своих логах и испугается.

---

## 4. Место на диске (uptimerobot custom monitor)

Самый дешёвый способ без отдельного агента: написать в API маленький
admin-endpoint вроде `/api/internal/disk` (или просто отдельный nginx-блок),
который возвращает `OK` пока места > 20%, иначе `LOW`. UptimeRobot мониторит
по keyword `OK`.

**Альтернатива без кода:** cron-скрипт на сервере:
```bash
# /etc/cron.d/fit-calendar-disk-check
*/15 * * * * root df / | awk 'NR==2 {if (int($5) > 80) print}' | \
  while read line; do \
    curl -fsS "https://api.telegram.org/bot${TOKEN}/sendMessage" \
      -d chat_id="${CHAT}" -d text="⚠️ Disk on $(hostname): $line"; \
  done
```
Подгрузить `TOKEN`/`CHAT` из `/etc/fit-calendar-backup.env` (тот же бот).

---

## 5. Чек-лист на каждую новую установку

```
[ ] install.sh отработал, /api/health отвечает 200
[ ] UptimeRobot: создан monitor api.<domain>/api/health с keyword
[ ] UptimeRobot: алерт в Telegram добавлен в monitor
[ ] Sentry: DSN'ы переданы в install.sh (api / mini / admin)
[ ] Sentry: первое тестовое событие пришло (триггернуть из админки кнопкой
    "Test error" или вручную: throw new Error в любом endpoint)
[ ] backup.sh: настроен cron + /etc/fit-calendar-backup.env с S3 и Telegram
[ ] backup.sh: первый прогон руками вернул архив в S3 (а не только локально)
[ ] backup.sh: проверка отрицательного сценария — упавший дамп шлёт алерт
[ ] disk-check cron установлен
[ ] Восстановление БД из последнего бэкапа на тестовой машине — отработало
```

Последний пункт — самый важный и самый часто игнорируемый. **Бэкап, который
ни разу не восстанавливали, — это не бэкап.**

---

## 6. Что НЕ настраиваем на старте (и почему)

- **Grafana + Prometheus + Loki.** Минимум стоимости — 1–2 ГБ RAM сверху на
  агента, и часы настройки на каждую инсталляцию. Имеет смысл, когда клубов
  10+ и хочется единый дашборд. До тех пор — UptimeRobot + Sentry закрывают
  95% реальных алертов.
- **APM (полная трассировка запросов в Sentry).** Уже подключено
  (`tracesSampleRate: 0.1`), но осмысленно смотреть начнётся, когда будет
  реальный трафик. До тех пор — шум.
- **PagerDuty / OpsGenie.** Платно и избыточно, пока нет нагрузки на 24/7
  on-call. Telegram-чат справляется.
- **Логи в централизованное хранилище.** `docker logs` хватает для дебага
  одного-двух клубов. Loki поднимается, когда нужно искать по логам нескольких
  инсталляций одновременно.

Эти пункты — не «потом сделаем», а **«сделаем, когда заболит»**. Раньше — не надо.

---

## 7. Что мониторить помимо технического

После 5+ клубов имеет смысл подключить **продуктовые** алерты, не
инфраструктурные:

- Падение количества записей на занятия за неделю на 30%.
- Тренер, у которого не появилось расписания за 7 дней.
- Бот не присылает напоминания (можно через Sentry breadcrumb из reminder-
  модуля).

Это уже не мониторинг падений, а раннее предупреждение о том, что клиент
тихо «отваливается» — и важная штука для удержания. Но это уже отдельная
задача, не часть базового SRE-чек-листа.
