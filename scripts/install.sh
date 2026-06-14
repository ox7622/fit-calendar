#!/usr/bin/env bash
# Установка fit-calendar на чистый Ubuntu 24.04 VPS одной командой.
# Идемпотентно: повторный запуск догоняет состояние, не ломает существующую инсталляцию.
#
# Пример:
#   curl -fsSL https://raw.githubusercontent.com/ox7622/fit-calendar/develop/scripts/install.sh \
#     | bash -s -- \
#         --domain club.ru \
#         --email owner@club.ru \
#         --bot-token 1234:ABC \
#         --geocoder YANDEX_KEY \
#         --admin-email owner@club.ru
#
# Запускать от root. Все секреты, не переданные флагами, генерируются автоматически
# и печатаются в финальном отчёте.

set -euo pipefail

# ---------- Конфигурация по умолчанию ----------
REPO_URL="https://github.com/ox7622/fit-calendar.git"
BRANCH="develop"
INSTALL_DIR="/opt/fit-calendar"
COMPOSE_FILE="docker/docker-compose.prod.yml"
COMPOSE_SENTRY_FILE="docker/docker-compose.sentry.yml"

DOMAIN=""
ACME_EMAIL=""
TG_BOT_TOKEN=""
TG_WEBHOOK_SECRET=""
GEOCODER_KEY=""
JWT_SECRET=""
DB_PASS=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
ADMIN_NAME="Owner"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
SENTRY_DSN=""
VITE_SENTRY_DSN_MINI=""
VITE_SENTRY_DSN_ADMIN=""

BACKUP_S3_BUCKET=""
BACKUP_S3_ENDPOINT=""
BACKUP_S3_REGION="ru-1"
BACKUP_S3_ACCESS_KEY=""
BACKUP_S3_SECRET_KEY=""
BACKUP_ALERT_BOT_TOKEN=""
BACKUP_ALERT_CHAT_ID=""
BACKUP_CRON_SCHEDULE="0 3 * * *"

UPTIMEROBOT_KEY=""

SKIP_DNS_CHECK=0
SKIP_DOCKER_INSTALL=0
FORCE_ENV=0

# ---------- Утилиты вывода ----------
log()  { printf "\n\033[1;34m==> %s\033[0m\n" "$*"; }
ok()   { printf "    \033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "    \033[1;33m!\033[0m %s\n" "$*"; }
err()  { printf "\n\033[1;31mERROR: %s\033[0m\n" "$*" >&2; }
die()  { err "$*"; exit 1; }

usage() {
    cat <<EOF
Использование: $0 [флаги]

Обязательные:
  --domain <DOMAIN>           домен (без www), например club.ru
  --email <EMAIL>             email для Let's Encrypt
  --bot-token <TOKEN>         токен Telegram-бота из @BotFather
  --geocoder <KEY>            API-ключ Yandex Geocoder
  --admin-email <EMAIL>       email первого администратора

Опциональные:
  --admin-password <PWD>      пароль админа (по умолчанию сгенерируется)
  --admin-name <NAME>         имя админа (по умолчанию "Owner")
  --jwt-secret <SECRET>       JWT секрет (по умолчанию сгенерируется)
  --db-pass <PASS>            пароль БД (по умолчанию сгенерируется)
  --webhook-secret <SECRET>   секрет Telegram-вебхука (по умолчанию сгенерируется)
  --cloudinary-cloud <NAME>   Cloudinary cloud name
  --cloudinary-key <KEY>      Cloudinary API key
  --cloudinary-secret <SEC>   Cloudinary API secret
  --sentry-dsn-api <DSN>      Sentry DSN для бэкенда
  --sentry-dsn-mini <DSN>     Sentry DSN для Mini App (инлайнится в бандл)
  --sentry-dsn-admin <DSN>    Sentry DSN для Admin (инлайнится в бандл)

Бэкап в S3 (опционально — задавай все 4 или ни одного):
  --backup-s3-bucket <NAME>   S3-бакет для бэкапов
  --backup-s3-endpoint <URL>  endpoint (Selectel: https://s3.ru-1.storage.selcloud.ru)
  --backup-s3-region <REGION> регион (default: ru-1)
  --backup-s3-access-key <K>  S3 access key
  --backup-s3-secret-key <K>  S3 secret key
  --backup-alert-bot-token <T>  токен служебного Telegram-бота для алертов
  --backup-alert-chat-id <ID>   chat_id для алертов
  --backup-cron <SCHEDULE>    cron-расписание (default: "0 3 * * *", каждый день в 03:00)

UptimeRobot (опционально):
  --uptimerobot-key <KEY>     Main API Key из UptimeRobot — создаст monitor
                              на https://api.<domain>/api/health с keyword "status":"ok"
  --repo <URL>                URL репозитория (default: $REPO_URL)
  --branch <BRANCH>           ветка (default: $BRANCH)
  --install-dir <PATH>        директория установки (default: $INSTALL_DIR)
  --skip-dns-check            не проверять DNS перед запуском
  --skip-docker-install       не устанавливать Docker (уже установлен)
  --force-env                 перезаписать существующий .env.prod
  --config-file <PATH>        читать настройки из shell-файла (KEY=VALUE).
                              Флаги командной строки перекрывают значения файла.
                              Шаблон: scripts/install.env.example
  -h, --help                  показать справку
EOF
}

# ---------- Pre-pass: --config-file (значения файла должны быть видны до парсинга
# других флагов, чтобы CLI имел приоритет над файлом). ----------
args=("$@")
for ((i=0; i<${#args[@]}; i++)); do
    if [[ "${args[$i]}" == "--config-file" ]]; then
        config_file="${args[$((i+1))]:-}"
        [[ -n "$config_file" && -f "$config_file" ]] || die "--config-file: файл не найден: ${config_file:-<пусто>}"
        # shellcheck source=/dev/null
        set -a; source "$config_file"; set +a
        # выкинуть пару флаг+значение из массива и переиндексировать
        unset 'args[i]' 'args[i+1]'
        args=("${args[@]}")
        break
    fi
done
set -- "${args[@]}"

# ---------- Разбор аргументов ----------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)              DOMAIN="$2"; shift 2 ;;
        --email)               ACME_EMAIL="$2"; shift 2 ;;
        --bot-token)           TG_BOT_TOKEN="$2"; shift 2 ;;
        --geocoder)            GEOCODER_KEY="$2"; shift 2 ;;
        --admin-email)         ADMIN_EMAIL="$2"; shift 2 ;;
        --admin-password)      ADMIN_PASSWORD="$2"; shift 2 ;;
        --admin-name)          ADMIN_NAME="$2"; shift 2 ;;
        --jwt-secret)          JWT_SECRET="$2"; shift 2 ;;
        --db-pass)             DB_PASS="$2"; shift 2 ;;
        --webhook-secret)      TG_WEBHOOK_SECRET="$2"; shift 2 ;;
        --cloudinary-cloud)    CLOUDINARY_CLOUD_NAME="$2"; shift 2 ;;
        --cloudinary-key)      CLOUDINARY_API_KEY="$2"; shift 2 ;;
        --cloudinary-secret)   CLOUDINARY_API_SECRET="$2"; shift 2 ;;
        --sentry-dsn-api)      SENTRY_DSN="$2"; shift 2 ;;
        --sentry-dsn-mini)     VITE_SENTRY_DSN_MINI="$2"; shift 2 ;;
        --sentry-dsn-admin)    VITE_SENTRY_DSN_ADMIN="$2"; shift 2 ;;
        --backup-s3-bucket)    BACKUP_S3_BUCKET="$2"; shift 2 ;;
        --backup-s3-endpoint)  BACKUP_S3_ENDPOINT="$2"; shift 2 ;;
        --backup-s3-region)    BACKUP_S3_REGION="$2"; shift 2 ;;
        --backup-s3-access-key) BACKUP_S3_ACCESS_KEY="$2"; shift 2 ;;
        --backup-s3-secret-key) BACKUP_S3_SECRET_KEY="$2"; shift 2 ;;
        --backup-alert-bot-token) BACKUP_ALERT_BOT_TOKEN="$2"; shift 2 ;;
        --backup-alert-chat-id)   BACKUP_ALERT_CHAT_ID="$2"; shift 2 ;;
        --backup-cron)         BACKUP_CRON_SCHEDULE="$2"; shift 2 ;;
        --uptimerobot-key)     UPTIMEROBOT_KEY="$2"; shift 2 ;;
        --repo)                REPO_URL="$2"; shift 2 ;;
        --branch)              BRANCH="$2"; shift 2 ;;
        --install-dir)         INSTALL_DIR="$2"; shift 2 ;;
        --skip-dns-check)      SKIP_DNS_CHECK=1; shift ;;
        --skip-docker-install) SKIP_DOCKER_INSTALL=1; shift ;;
        --force-env)           FORCE_ENV=1; shift ;;
        -h|--help)             usage; exit 0 ;;
        *)                     die "Неизвестный флаг: $1 (см. --help)" ;;
    esac
done

# ---------- Валидация ----------
[[ -n "$DOMAIN" ]]       || die "--domain обязателен"
[[ -n "$ACME_EMAIL" ]]   || die "--email обязателен"
[[ -n "$TG_BOT_TOKEN" ]] || die "--bot-token обязателен"
[[ -n "$GEOCODER_KEY" ]] || die "--geocoder обязателен"
[[ -n "$ADMIN_EMAIL" ]]  || die "--admin-email обязателен"

[[ $EUID -eq 0 ]] || die "Запусти под root (sudo bash install.sh ...)"

# ---------- Шаг 1: Preflight ----------
log "Шаг 1. Проверки окружения"

# OS
if ! grep -qi "ubuntu" /etc/os-release 2>/dev/null; then
    warn "Скрипт тестировался только на Ubuntu 24.04, продолжаю на свой страх и риск"
else
    ok "ОС: $(. /etc/os-release && echo "$PRETTY_NAME")"
fi

# RAM
ram_mb=$(free -m | awk '/^Mem:/ {print $2}')
if [[ $ram_mb -lt 1800 ]]; then
    warn "RAM ${ram_mb}MB — мало для сборки. Включаю swap..."
    if [[ ! -f /swapfile ]]; then
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile >/dev/null
        swapon /swapfile
        grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
        ok "Swap 2G создан и активирован"
    else
        ok "Swap уже настроен"
    fi
else
    ok "RAM ${ram_mb}MB — достаточно"
fi

# Disk
disk_free_gb=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
if [[ $disk_free_gb -lt 10 ]]; then
    die "Свободного места на диске ${disk_free_gb}GB — нужно минимум 10GB"
fi
ok "Свободно на диске: ${disk_free_gb}GB"

# DNS
if [[ $SKIP_DNS_CHECK -eq 0 ]]; then
    server_ip=$(curl -fsS --max-time 5 https://api.ipify.org || true)
    if [[ -z "$server_ip" ]]; then
        warn "Не удалось определить публичный IP сервера, пропускаю DNS-проверку"
    else
        ok "IP сервера: $server_ip"
        for sub in api app admin; do
            resolved=$(dig +short "${sub}.${DOMAIN}" @8.8.8.8 | tail -1)
            if [[ "$resolved" == "$server_ip" ]]; then
                ok "DNS ${sub}.${DOMAIN} → $resolved"
            else
                warn "DNS ${sub}.${DOMAIN} → '${resolved:-нет записи}' (ожидался $server_ip)"
                warn "Caddy не сможет выпустить сертификат. Поправь DNS и запусти снова."
            fi
        done
    fi
fi

# ---------- Шаг 2: Docker + UFW ----------
log "Шаг 2. Docker и фаервол"

if [[ $SKIP_DOCKER_INSTALL -eq 0 ]] && ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
    ok "Docker установлен"
else
    ok "Docker уже установлен: $(docker --version)"
fi

if command -v ufw >/dev/null 2>&1; then
    ufw allow OpenSSH >/dev/null 2>&1 || true
    ufw allow 80/tcp >/dev/null 2>&1 || true
    ufw allow 443/tcp >/dev/null 2>&1 || true
    ufw --force enable >/dev/null 2>&1 || true
    ok "UFW: открыты 22, 80, 443"
else
    warn "UFW не установлен, пропускаю настройку фаервола"
fi

# ---------- Шаг 3: Код ----------
log "Шаг 3. Получение кода"

# Three states: (a) repo present → update; (b) dir exists but no .git → bootstrap
# git in place over existing files (this is what we hit when an earlier install
# was extracted from a tarball or `.git` got pruned); (c) empty → fresh clone.
# Full clone (not --depth=1) so rollback via `git reset --hard <prev>` works.
if [[ -d "$INSTALL_DIR/.git" ]]; then
    git -C "$INSTALL_DIR" fetch origin "$BRANCH" --quiet
    git -C "$INSTALL_DIR" checkout "$BRANCH" --quiet
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH" --quiet
    ok "Репо обновлено: $(git -C "$INSTALL_DIR" rev-parse --short HEAD)"
elif [[ -d "$INSTALL_DIR" ]]; then
    git -C "$INSTALL_DIR" init --quiet
    git -C "$INSTALL_DIR" remote add origin "$REPO_URL" 2>/dev/null \
        || git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL"
    git -C "$INSTALL_DIR" fetch origin "$BRANCH" --quiet
    git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH" --quiet
    ok "Репо инициализировано in-place: $(git -C "$INSTALL_DIR" rev-parse --short HEAD)"
else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    ok "Репо склонировано в $INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ---------- Шаг 4: Секреты ----------
log "Шаг 4. Генерация секретов"

[[ -n "$JWT_SECRET" ]]        || JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
[[ -n "$DB_PASS" ]]            || DB_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
[[ -n "$TG_WEBHOOK_SECRET" ]]  || TG_WEBHOOK_SECRET=$(openssl rand -hex 32)
[[ -n "$ADMIN_PASSWORD" ]]     || ADMIN_PASSWORD=$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 20)
ok "Секреты готовы"

# ---------- Шаг 5: .env.prod ----------
log "Шаг 5. Запись .env.prod"

if [[ -f .env.prod && $FORCE_ENV -eq 0 ]]; then
    warn ".env.prod уже существует — оставляю как есть (--force-env чтобы перезаписать)"
else
    cat > .env.prod <<EOF
# Сгенерировано install.sh $(date -Iseconds)
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

NX_DB_NAME=fitcalendar
NX_DB_USER=fitcalendar
NX_DB_PASS=$DB_PASS
NX_DB_LOGGING=error,warn

JWT_SECRET=$JWT_SECRET
TELEGRAM_BOT_TOKEN=$TG_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET=$TG_WEBHOOK_SECRET

YANDEX_GEOCODER_API_KEY=$GEOCODER_KEY

CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET

SENTRY_DSN=$SENTRY_DSN
VITE_SENTRY_DSN_MINI=$VITE_SENTRY_DSN_MINI
VITE_SENTRY_DSN_ADMIN=$VITE_SENTRY_DSN_ADMIN
EOF
    chmod 600 .env.prod
    ok ".env.prod записан (chmod 600)"
fi

# ---------- Шаг 6: docker compose up ----------
log "Шаг 6. Сборка и запуск контейнеров (может занять 5–10 минут)"

# Если задан хоть один Sentry DSN — подключаем overlay-файл, чтобы пробросить
# переменные в API (env) и фронт (build args).
compose_files=(-f "$COMPOSE_FILE")
if [[ -n "$SENTRY_DSN$VITE_SENTRY_DSN_MINI$VITE_SENTRY_DSN_ADMIN" ]]; then
    compose_files+=(-f "$COMPOSE_SENTRY_FILE")
    ok "Sentry overlay подключён ($COMPOSE_SENTRY_FILE)"
fi

docker compose --env-file .env.prod "${compose_files[@]}" up -d --build
ok "Контейнеры запущены"

# ---------- Шаг 7: Ожидание готовности API ----------
log "Шаг 7. Ожидание готовности API"

health_url="https://api.${DOMAIN}/api/health"
for i in $(seq 1 60); do
    if curl -fsS --max-time 3 "$health_url" >/dev/null 2>&1; then
        ok "API отвечает на $health_url"
        break
    fi
    if [[ $i -eq 60 ]]; then
        err "API не поднялся за 5 минут. Логи:"
        docker compose "${compose_files[@]}" logs --tail=50 api >&2
        die "Проверь DNS / порты 80,443 / .env.prod"
    fi
    sleep 5
done

# ---------- Шаг 8: Создание админа ----------
log "Шаг 8. Создание администратора"

admin_hash=$(docker compose "${compose_files[@]}" exec -T api \
    node -e "console.log(require('bcrypt').hashSync(process.argv[1], 10))" \
    "$ADMIN_PASSWORD")

# Идемпотентно: если админ с таким email уже есть — ничего не делаем
docker compose "${compose_files[@]}" exec -T postgres \
    psql -U fitcalendar -d fitcalendar -v ON_ERROR_STOP=1 <<SQL >/dev/null
INSERT INTO admin_users (email, "passwordHash", name, "isActive")
VALUES ('$ADMIN_EMAIL', '$admin_hash', '$ADMIN_NAME', true)
ON CONFLICT (email) DO NOTHING;
SQL
ok "Админ создан (или уже существовал): $ADMIN_EMAIL"

# ---------- Шаг 9: Backup cron ----------
log "Шаг 9. Настройка авто-бэкапа"

BACKUP_STATUS="пропущено (флаги --backup-s3-* не заданы)"
if [[ -n "$BACKUP_S3_BUCKET" ]]; then
    if [[ -z "$BACKUP_S3_ACCESS_KEY" || -z "$BACKUP_S3_SECRET_KEY" ]]; then
        warn "S3-bucket задан, но access/secret-key не переданы — бэкап настраиваться не будет"
        BACKUP_STATUS="ошибка: нет ключей S3"
    else
        # /etc/fit-calendar-backup.env — конфиг для backup.sh
        umask 077
        cat > /etc/fit-calendar-backup.env <<EOF
# Сгенерировано install.sh $(date -Iseconds)
INSTALL_DIR=$INSTALL_DIR
BACKUP_DIR=/var/backups/fit-calendar
LOCAL_RETENTION_DAYS=7

BACKUP_S3_BUCKET=$BACKUP_S3_BUCKET
BACKUP_S3_ENDPOINT=$BACKUP_S3_ENDPOINT
BACKUP_S3_REGION=$BACKUP_S3_REGION
AWS_ACCESS_KEY_ID=$BACKUP_S3_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$BACKUP_S3_SECRET_KEY

BACKUP_ALERT_BOT_TOKEN=$BACKUP_ALERT_BOT_TOKEN
BACKUP_ALERT_CHAT_ID=$BACKUP_ALERT_CHAT_ID
BACKUP_ALERT_ON_SUCCESS=0
EOF
        umask 022
        ok "Конфиг /etc/fit-calendar-backup.env создан (chmod 600)"

        # Cron entry — заметь TZ, чтобы 03:00 был по локальному времени, а не UTC
        local_tz=$(timedatectl show --value -p Timezone 2>/dev/null || echo "Europe/Moscow")
        cat > /etc/cron.d/fit-calendar-backup <<EOF
# Auto-generated by install.sh — daily DB backup
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
TZ=$local_tz
$BACKUP_CRON_SCHEDULE root $INSTALL_DIR/scripts/backup.sh >> /var/log/fit-calendar-backup.log 2>&1
EOF
        chmod 644 /etc/cron.d/fit-calendar-backup
        ok "Cron установлен: $BACKUP_CRON_SCHEDULE ($local_tz)"
        BACKUP_STATUS="настроен ($BACKUP_CRON_SCHEDULE → s3://$BACKUP_S3_BUCKET)"

        # Прогон руками — проверить, что весь пайплайн работает.
        # Если упадёт — алерт пойдёт в Telegram (если настроен) + здесь увидим.
        log "Пробный прогон backup.sh..."
        if "$INSTALL_DIR/scripts/backup.sh"; then
            ok "Первый бэкап выполнен успешно"
        else
            warn "Первый бэкап упал — проверь /var/log/fit-calendar-backup.log"
            BACKUP_STATUS="cron поставлен, но первый запуск упал"
        fi
    fi
else
    warn "$BACKUP_STATUS"
fi

# ---------- Шаг 10: UptimeRobot ----------
log "Шаг 10. UptimeRobot monitor"

UPTIME_STATUS="пропущено (флаг --uptimerobot-key не задан)"
if [[ -n "$UPTIMEROBOT_KEY" ]]; then
    monitor_url="https://api.${DOMAIN}/api/health"
    monitor_name="${DOMAIN} API"

    # type=2 — keyword monitor; keyword_type=2 — alert when keyword NOT exists
    # interval=300 — 5 минут (минимум на free-тарифе)
    response=$(curl -fsS -X POST "https://api.uptimerobot.com/v2/newMonitor" \
        -d "api_key=${UPTIMEROBOT_KEY}" \
        -d "format=json" \
        -d "type=2" \
        -d "url=${monitor_url}" \
        -d "friendly_name=${monitor_name}" \
        -d "keyword_type=2" \
        -d "keyword_value=\"status\":\"ok\"" \
        -d "interval=300" 2>&1 || true)

    if echo "$response" | grep -q '"stat":"ok"'; then
        monitor_id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
        ok "Monitor создан (id=$monitor_id) для $monitor_url"
        UPTIME_STATUS="создан monitor id=$monitor_id"
    elif echo "$response" | grep -q "already exists\|Monitor already exists"; then
        warn "Monitor для ${monitor_url} уже существует — пропускаю"
        UPTIME_STATUS="уже существовал"
    else
        warn "UptimeRobot вернул ошибку: $response"
        UPTIME_STATUS="ошибка API (см. лог)"
    fi
else
    warn "$UPTIME_STATUS"
fi

# ---------- Шаг 11: Финальный отчёт ----------
log "Шаг 11. Готово!"

cat <<EOF

╔══════════════════════════════════════════════════════════════════╗
║                  УСТАНОВКА ЗАВЕРШЕНА                             ║
╚══════════════════════════════════════════════════════════════════╝

URL'ы:
  API:     https://api.${DOMAIN}
  Mini App: https://app.${DOMAIN}
  Admin:   https://admin.${DOMAIN}

Доступы администратора:
  Email:    $ADMIN_EMAIL
  Password: $ADMIN_PASSWORD

Секреты (сохрани в надёжное место):
  DB_PASS:                $DB_PASS
  JWT_SECRET:             $JWT_SECRET
  TELEGRAM_WEBHOOK_SECRET: $TG_WEBHOOK_SECRET

Файл с секретами на сервере: $INSTALL_DIR/.env.prod (chmod 600)

Авто-настройки:
  Бэкап БД:     $BACKUP_STATUS
  UptimeRobot:  $UPTIME_STATUS

──────────────────────────────────────────────────────────────────
Что осталось сделать руками:

1. В @BotFather привязать Mini App к домену:
   /mybots → выбрать бота → Bot Settings → Configure Mini App
   → ввести: app.${DOMAIN}

2. Проверить вебхук бота:
   curl "https://api.telegram.org/bot${TG_BOT_TOKEN}/getWebhookInfo"
   Ожидается last_error_message: null

3. Войти в админку и заполнить:
   https://admin.${DOMAIN}
   - Профиль клуба (адрес → "Определить по адресу")
   - Тренеры
   - Типы занятий
   - Расписание

4. Тест-чек:
   - https://api.${DOMAIN}/api/health → {"status":"ok",...}
   - В боте отправить /start, /today, /club
   - Кнопка "Меню" в боте открывает Mini App

──────────────────────────────────────────────────────────────────
Обновление в будущем:
   cd $INSTALL_DIR && git pull
   docker compose --env-file .env.prod ${compose_files[*]} up -d --build

Логи:
   docker compose ${compose_files[*]} logs -f api

EOF
