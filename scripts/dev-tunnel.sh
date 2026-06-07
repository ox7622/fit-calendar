#!/usr/bin/env bash
# Auto-managed Cloudflare quick tunnels for local Telegram Mini App testing.
#
# Spawns two `cloudflared tunnel --url` processes (API on :3020, mini-app on :4200),
# writes the resulting URLs into .env.local (VITE_API_URL / CORS_ORIGIN_MINI_APP /
# MINI_APP_URL), and restarts the API + Vite dev server so they pick up the new env.
# The bot's chat menu button is owned by the bot itself (set to type:'commands' on
# startup) — it no longer holds a URL, so no per-cycle resync needed here.
#
# Cloudflare quick tunnels get reaped after periods of inactivity ("Unauthorized:
# Tunnel not found"). This loop watches each tunnel log; when one dies, the whole
# cycle restarts so you don't have to touch .env.local or BotFather again.
#
# Usage:  pnpm dev:tunnel   (or ./scripts/dev-tunnel.sh)
# Stop:   Ctrl+C — children are reaped on exit.

set -uo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"

ENV_FILE=".env.local"
API_PORT=3020
MINI_PORT=4200
HEALTH_INTERVAL=30

API_LOG=$(mktemp -t dev-tunnel-api)
MINI_LOG=$(mktemp -t dev-tunnel-mini)

log() { printf '\033[1;36m[%s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }

require_bin() {
    if ! command -v "$1" >/dev/null 2>&1; then
        log "ERROR: '$1' not found in PATH"; exit 1
    fi
}
require_bin cloudflared
require_bin dig
require_bin lsof

# ─── env file IO ────────────────────────────────────────────────────────────
set_env() {
    local key=$1 value=$2
    if grep -qE "^${key}=" "$ENV_FILE" 2>/dev/null; then
        sed -i '' -E "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
    else
        printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
    fi
}
get_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2-; }

# ─── tunnel lifecycle ───────────────────────────────────────────────────────
spawn_tunnel() {
    local port=$1 logf=$2
    : > "$logf"
    cloudflared tunnel --protocol http2 --url "http://localhost:$port" \
        >"$logf" 2>&1 &
}

wait_for_url() {
    local logf=$1
    for _ in $(seq 1 30); do
        if grep -q "Registered tunnel connection" "$logf" 2>/dev/null; then
            grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$logf" | head -1
            return 0
        fi
        sleep 1
    done
    return 1
}

# ─── app restart ────────────────────────────────────────────────────────────
# Mini-app is served via `vite preview` against a fresh static build, not
# `vite dev`. The dev server fans out 50+ small ESM requests over the tunnel
# and Telegram's mobile WebView intermittently chokes on it ("failed to load").
# A static bundle is 3 files, which the WebView handles reliably.
# Trade-off: each tunnel cycle costs ~2s for a rebuild because Vite inlines
# VITE_API_URL at build time.
restart_apps() {
    log "restarting API + bot + mini-app"
    lsof -tnP -iTCP:$API_PORT -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
    lsof -tnP -iTCP:$MINI_PORT -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
    pkill -f "nx.js serve mini-app" 2>/dev/null
    pkill -f "vite preview" 2>/dev/null
    # Bot has no listening port — kill by path so it picks up the new MINI_APP_URL.
    pkill -f "node dist/apps/bot/main.js" 2>/dev/null
    sleep 2

    # Strip lines that aren't KEY=VALUE so `env $(...)` won't choke on comments.
    local env_args
    env_args=$(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | tr '\n' ' ')

    env $env_args node dist/apps/api/main.js >/tmp/dev-tunnel-api.log 2>&1 &
    env $env_args node dist/apps/bot/main.js >/tmp/dev-tunnel-bot.log 2>&1 &

    log "rebuilding mini-app (new VITE_API_URL inlined)"
    # --skip-nx-cache is mandatory here: the tunnel URL (and thus VITE_API_URL)
    # changes every cycle, and a cache hit would replay a bundle baked with the
    # PREVIOUS, now-dead tunnel URL — the mini-app would fetch a host that no
    # longer resolves. The project.json `env` inputs make the cache key correct
    # too, but skipping outright is the bulletproof choice for a flow that
    # rebuilds every cycle anyway.
    env $env_args pnpm nx build mini-app --skip-nx-cache >/tmp/dev-tunnel-build.log 2>&1
    if [ $? -ne 0 ]; then
        log "WARN: mini-app build failed — see /tmp/dev-tunnel-build.log"
    fi

    # NB: vite picks up cwd from pnpm's workspace root regardless of where we
    # invoke it, so the config path has to be relative to the workspace root.
    pnpm vite preview \
        --config apps/mini-app/vite.config.ts \
        --port "$MINI_PORT" \
        --host 127.0.0.1 \
        --strictPort \
        >/tmp/dev-tunnel-mini.log 2>&1 &
}

# ─── cleanup on exit ────────────────────────────────────────────────────────
cleanup() {
    log "shutting down"
    pkill -P $$ 2>/dev/null
    pkill -f cloudflared 2>/dev/null
    pkill -f "nx.js serve mini-app" 2>/dev/null
    pkill -f "vite preview" 2>/dev/null
    pkill -f "node dist/apps/bot/main.js" 2>/dev/null
    lsof -tnP -iTCP:$API_PORT -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
    lsof -tnP -iTCP:$MINI_PORT -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null
    rm -f "$API_LOG" "$MINI_LOG"
    exit 0
}
trap cleanup INT TERM

# ─── main loop ──────────────────────────────────────────────────────────────
while true; do
    log "cycling tunnels (any old ones will be killed)"
    pkill -f cloudflared 2>/dev/null
    sleep 2

    spawn_tunnel "$API_PORT" "$API_LOG"
    spawn_tunnel "$MINI_PORT" "$MINI_LOG"

    API_URL=$(wait_for_url "$API_LOG")  || { log "API tunnel registration timed out"; sleep 5; continue; }
    MINI_URL=$(wait_for_url "$MINI_LOG") || { log "MA tunnel registration timed out"; sleep 5; continue; }
    log "API:      $API_URL"
    log "MINI-APP: $MINI_URL"

    set_env VITE_API_URL "${API_URL}/api"
    # The standalone bot (polling mode) reads API_URL to fetch /today over HTTP —
    # without it the bot replies "сервис недоступен". Bare origin: the bot appends
    # the `/api/...` path itself.
    set_env API_URL "$API_URL"
    set_env CORS_ORIGIN_MINI_APP "$MINI_URL"
    set_env MINI_APP_URL "$MINI_URL"

    restart_apps

    log "ready. open the mini-app in Telegram. monitoring tunnels every ${HEALTH_INTERVAL}s"

    # Watch both logs. The death signature is "Unauthorized: Tunnel not found".
    # Track byte size at the start of monitoring so we only look at NEW lines.
    api_size=$(wc -c < "$API_LOG")
    mini_size=$(wc -c < "$MINI_LOG")
    while true; do
        sleep "$HEALTH_INTERVAL"
        api_new=$(tail -c "+$((api_size + 1))" "$API_LOG" 2>/dev/null || true)
        mini_new=$(tail -c "+$((mini_size + 1))" "$MINI_LOG" 2>/dev/null || true)
        if echo "$api_new" | grep -q "Unauthorized: Tunnel not found" \
            || echo "$mini_new" | grep -q "Unauthorized: Tunnel not found"; then
            log "tunnel reaped by Cloudflare — recycling"
            break
        fi
        api_size=$(wc -c < "$API_LOG")
        mini_size=$(wc -c < "$MINI_LOG")
    done
done
