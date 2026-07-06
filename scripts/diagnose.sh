#!/bin/bash
# Quick health check for TempTrack Docker deployment.
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=============================================="
echo " TempTrack diagnose — $APP_DIR"
echo "=============================================="
echo ""

echo "=== git HEAD ==="
git log -1 --oneline 2>/dev/null || echo "(not a git repo)"
echo ""

echo "=== frontend bundle ==="
if docker compose ps --status running app 2>/dev/null | grep -q app; then
  BUILD_VER=$(docker compose exec -T app cat /app/public/build-version.txt 2>/dev/null | tr -d '\r\n' || true)
  if [ -n "$BUILD_VER" ]; then
    echo "  build-version.txt: $BUILD_VER"
    if [ -f .git/HEAD ] && command -v git >/dev/null 2>&1; then
      LOCAL_HEAD=$(git rev-parse --short HEAD 2>/dev/null || true)
      if [ -n "$LOCAL_HEAD" ] && [ "$BUILD_VER" != "$LOCAL_HEAD" ]; then
        echo "  ⚠️  Container build ($BUILD_VER) ≠ git HEAD ($LOCAL_HEAD) — rebuild required"
      fi
    fi
  fi
  HAS_HISTORY=$(docker compose exec -T app sh -c 'find /app/public/assets -name "*.js" -exec grep -l "history/query" {} + 2>/dev/null | head -1' || true)
  HAS_FLOOR=$(docker compose exec -T app sh -c 'find /app/public/assets -name "*.js" -exec grep -l "floor-plan" {} + 2>/dev/null | head -1' || true)
  HAS_OLD=$(docker compose exec -T app sh -c 'find /app/public/assets -name "*.js" -exec grep -l "coming soon" {} + 2>/dev/null | head -1' || true)
  if [ -n "$HAS_HISTORY" ] && [ -n "$HAS_FLOOR" ]; then
    echo "  OK — History + Floor Plan UI in deployed frontend"
  elif [ -n "$HAS_OLD" ]; then
    echo "  ⚠️  OLD frontend (History placeholder) — rebuild required:"
    echo "     docker compose build --no-cache app && docker compose up -d --force-recreate"
  else
    echo "  ⚠️  Could not verify frontend bundle. Inspect manually:"
    echo "     docker compose exec app ls -la /app/public/assets/"
  fi
else
  echo "  (app container not running — skip)"
fi
echo ""

echo "=== docker compose ps ==="
docker compose ps
echo ""

echo "=== app logs (last 80) ==="
docker compose logs app --tail 80 2>/dev/null || echo "(no app logs)"
echo ""

APP_STATUS=$(docker compose ps --format '{{.Status}}' app 2>/dev/null | head -1)
if echo "$APP_STATUS" | grep -qE 'Restarting|starting'; then
  echo "⚠️  app may be crash-looping. Check logs for Prisma P2021 (missing tables)."
  echo "    bash scripts/fix-permissions.sh"
  echo "    git fetch origin && git reset --hard origin/main"
  echo "    docker compose up -d --build"
  echo ""
fi

if docker compose logs app 2>/dev/null | grep -q 'public.param.*does not exist'; then
  echo "⚠️  Database tables missing. After pulling latest code, restart app:"
  echo "    docker compose up -d --build app"
  echo ""
fi

echo "=== mqtt-broker logs (last 15) ==="
docker compose logs mqtt-broker --tail 15 2>/dev/null || true
MQTT_STATUS=$(docker compose ps --format '{{.Status}}' mqtt-broker 2>/dev/null | head -1)
if echo "$MQTT_STATUS" | grep -qi restarting; then
  echo ""
  echo "⚠️  mqtt-broker is crash-looping (often exit 13 = permission denied on passwd/data/log)."
  echo "    bash scripts/fix-permissions.sh"
  echo "    docker compose restart mqtt-broker app"
  echo "    Or: sudo chown 1883:1883 mosquitto/config/passwd && docker compose restart mqtt-broker"
fi
echo ""

echo "=== postgresql-db logs (last 10) ==="
docker compose logs postgresql-db --tail 10 2>/dev/null || true
echo ""

echo "=== connectivity from host ==="
if command -v curl >/dev/null 2>&1; then
  curl -sS -o /dev/null -w "  http://127.0.0.1:3011/  → HTTP %{http_code}\n" http://127.0.0.1:3011/ 2>/dev/null \
    || echo "  http://127.0.0.1:3011/  → failed"
  curl -sk -o /dev/null -w "  https://127.0.0.1:3011/ → HTTPS %{http_code}\n" https://127.0.0.1:3011/ 2>/dev/null \
    || echo "  https://127.0.0.1:3011/ → failed"
else
  echo "  curl not installed — skip HTTP checks"
fi
echo ""

echo "=== listening ports (3011) ==="
(ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null || true) | grep 3011 || echo "  nothing listening on 3011"
echo ""

echo "=== .env keys (values hidden) ==="
for key in NODE_PORT USE_HTTP JWT_SECRET MQTT_HOST POSTGRES_HOST SERVER_PUBLIC_IP; do
  if grep -q "^${key}=" .env 2>/dev/null; then
    echo "  ${key}=<set>"
  else
    echo "  ${key}=<missing>"
  fi
done
echo ""

echo "Access URL:"
SERVER_IP="10.0.56.200"
if grep -q '^SERVER_PUBLIC_IP=' .env 2>/dev/null; then
  SERVER_IP=$(grep '^SERVER_PUBLIC_IP=' .env | cut -d= -f2-)
fi
echo "  https://${SERVER_IP}:3011  (accept self-signed cert)"
echo "  Gateway MQTT: ${SERVER_IP}:1883"
echo "=============================================="
