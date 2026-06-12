#!/usr/bin/env bash
# Бэкап БД fit-calendar: pg_dump из postgres-контейнера → локальный gzip →
# опционально в S3-совместимое хранилище (Selectel / Yandex Object Storage / AWS).
# Алерт в Telegram при падении. Запускать из cron от root.
#
# Установка cron (раз в сутки в 03:00 по серверному времени):
#   echo '0 3 * * * root /opt/fit-calendar/scripts/backup.sh >> /var/log/fit-calendar-backup.log 2>&1' \
#     > /etc/cron.d/fit-calendar-backup
#   chmod 644 /etc/cron.d/fit-calendar-backup
#
# Конфиг (по желанию) — в /etc/fit-calendar-backup.env:
#   INSTALL_DIR=/opt/fit-calendar
#   BACKUP_DIR=/var/backups/fit-calendar
#   LOCAL_RETENTION_DAYS=7
#   # --- S3 (опционально, оставь пустым чтобы только локальный бэкап) ---
#   BACKUP_S3_BUCKET=fitcalendar-backups
#   BACKUP_S3_ENDPOINT=https://s3.ru-1.storage.selcloud.ru
#   BACKUP_S3_REGION=ru-1
#   AWS_ACCESS_KEY_ID=...
#   AWS_SECRET_ACCESS_KEY=...
#   # --- Telegram алерт (опционально) ---
#   BACKUP_ALERT_BOT_TOKEN=<отдельный бот для алертов, НЕ клиентский>
#   BACKUP_ALERT_CHAT_ID=<твой chat_id>
#   BACKUP_ALERT_ON_SUCCESS=0   # 1 = пинговать и при успехе
#
# Восстановление (вручную, осознанно):
#   gunzip -c /var/backups/fit-calendar/fitcalendar-<DATE>.sql.gz \
#     | docker compose -f /opt/fit-calendar/docker/docker-compose.prod.yml \
#         exec -T postgres psql -U fitcalendar -d fitcalendar

set -euo pipefail

# ---------- Конфиг ----------
CONFIG_FILE="${CONFIG_FILE:-/etc/fit-calendar-backup.env}"
if [[ -f "$CONFIG_FILE" ]]; then
    # shellcheck source=/dev/null
    set -a; source "$CONFIG_FILE"; set +a
fi

INSTALL_DIR="${INSTALL_DIR:-/opt/fit-calendar}"
COMPOSE_FILE="$INSTALL_DIR/docker/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/fit-calendar}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"

BACKUP_S3_BUCKET="${BACKUP_S3_BUCKET:-}"
BACKUP_S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-ru-1}"

BACKUP_ALERT_BOT_TOKEN="${BACKUP_ALERT_BOT_TOKEN:-}"
BACKUP_ALERT_CHAT_ID="${BACKUP_ALERT_CHAT_ID:-}"
BACKUP_ALERT_ON_SUCCESS="${BACKUP_ALERT_ON_SUCCESS:-0}"

DB_NAME="${NX_DB_NAME:-fitcalendar}"
DB_USER="${NX_DB_USER:-fitcalendar}"
HOST="$(hostname)"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

# ---------- Telegram alert ----------
send_alert() {
    local text="$1"
    [[ -z "$BACKUP_ALERT_BOT_TOKEN" || -z "$BACKUP_ALERT_CHAT_ID" ]] && return 0
    curl -fsS --max-time 10 -X POST \
        "https://api.telegram.org/bot${BACKUP_ALERT_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${BACKUP_ALERT_CHAT_ID}" \
        --data-urlencode "text=${text}" >/dev/null || true
}

on_error() {
    local exit_code=$?
    local line=$1
    local cmd=$2
    local msg
    msg="❌ Backup FAILED on ${HOST}
line ${line}, exit ${exit_code}
cmd: ${cmd}"
    log "FAILED at line ${line}: ${cmd} (exit ${exit_code})"
    send_alert "$msg"
    exit "$exit_code"
}
trap 'on_error $LINENO "$BASH_COMMAND"' ERR

# ---------- Preflight ----------
[[ -d "$INSTALL_DIR" ]] || { log "Нет $INSTALL_DIR"; exit 1; }
[[ -f "$COMPOSE_FILE" ]] || { log "Нет $COMPOSE_FILE"; exit 1; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H%M%S)
DUMP_FILE="$BACKUP_DIR/fitcalendar-${DATE}.sql.gz"

cd "$INSTALL_DIR"

# ---------- Dump ----------
log "Дамп БД → ${DUMP_FILE}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --clean --if-exists \
    | gzip -9 > "$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
    log "Дамп пустой!"
    rm -f "$DUMP_FILE"
    exit 1
fi

size=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
size_h=$(numfmt --to=iec "$size" 2>/dev/null || echo "${size}B")
log "Дамп готов: ${size_h}"

# Sanity check: содержит ли хотя бы один CREATE TABLE (защита от пустых дампов
# при сломанной БД)
if ! gunzip -c "$DUMP_FILE" | head -200 | grep -q "CREATE TABLE"; then
    log "В дампе нет CREATE TABLE — что-то сломано"
    exit 1
fi

# ---------- Upload to S3 (опционально) ----------
# Схема ретенции (управляется через S3 lifecycle policy, см. docs/deploy/s3-lifecycle.md):
#   daily/   — каждый день, хранится 7 дней
#   weekly/  — по воскресеньям, хранится 5 недель
#   monthly/ — 1-го числа месяца, хранится ~13 месяцев
# Дополнительные копии в weekly/ и monthly/ делаются через server-side S3 COPY,
# а не повторной заливкой — это бесплатная операция внутри бакета.
s3_run() {
    local args=("$@")
    [[ -n "$BACKUP_S3_ENDPOINT" ]] && args+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
    docker run --rm \
        -v "$BACKUP_DIR:/backups:ro" \
        -e AWS_ACCESS_KEY_ID \
        -e AWS_SECRET_ACCESS_KEY \
        -e AWS_DEFAULT_REGION="$BACKUP_S3_REGION" \
        amazon/aws-cli:latest \
        "${args[@]}" >/dev/null
}

if [[ -n "$BACKUP_S3_BUCKET" ]]; then
    fname="$(basename "$DUMP_FILE")"

    log "Загрузка в s3://${BACKUP_S3_BUCKET}/daily/"
    s3_run s3 cp "/backups/${fname}" "s3://${BACKUP_S3_BUCKET}/daily/${fname}"

    # Воскресенье — копия в weekly/
    if [[ "$(date +%u)" == "7" ]]; then
        log "Копия в s3://${BACKUP_S3_BUCKET}/weekly/ (воскресенье)"
        s3_run s3 cp \
            "s3://${BACKUP_S3_BUCKET}/daily/${fname}" \
            "s3://${BACKUP_S3_BUCKET}/weekly/${fname}"
    fi

    # 1-е число месяца — копия в monthly/
    if [[ "$(date +%d)" == "01" ]]; then
        log "Копия в s3://${BACKUP_S3_BUCKET}/monthly/ (1-е число месяца)"
        s3_run s3 cp \
            "s3://${BACKUP_S3_BUCKET}/daily/${fname}" \
            "s3://${BACKUP_S3_BUCKET}/monthly/${fname}"
    fi
else
    log "S3 не настроен — только локальный бэкап"
fi

# ---------- Локальная ротация ----------
deleted=$(find "$BACKUP_DIR" -name "fitcalendar-*.sql.gz" -mtime "+${LOCAL_RETENTION_DAYS}" -print -delete | wc -l)
log "Ротация: удалено ${deleted} файлов старше ${LOCAL_RETENTION_DAYS} дней"

# ---------- Success alert (опционально) ----------
if [[ "$BACKUP_ALERT_ON_SUCCESS" == "1" ]]; then
    send_alert "✅ Backup OK on ${HOST}
$(basename "$DUMP_FILE")
${size_h}"
fi

log "Готово"
