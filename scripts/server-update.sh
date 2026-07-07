#!/bin/bash
# Pull latest from GitHub and redeploy TempTrack on Ubuntu server.
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo "=============================================="
echo " TempTrack server update — $APP_DIR"
echo "=============================================="

bash "$APP_DIR/scripts/fix-permissions.sh" 2>/dev/null || true

echo "📥 Fetching latest from GitHub..."
git fetch origin
git reset --hard origin/main
echo "   HEAD: $(git log -1 --oneline)"

if ! grep -q '^SERVER_PUBLIC_IP=' .env 2>/dev/null; then
  echo "SERVER_PUBLIC_IP=10.0.56.200" >> .env
elif grep -q '^SERVER_PUBLIC_IP=10.0.56.130' .env 2>/dev/null; then
  sed -i 's/^SERVER_PUBLIC_IP=10.0.56.130/SERVER_PUBLIC_IP=10.0.56.200/' .env
  echo "ℹ️  Updated SERVER_PUBLIC_IP to 10.0.56.200 in .env"
fi

bash "$APP_DIR/scripts/repair-env.sh" 2>/dev/null || true
rm -f "$APP_DIR/mosquitto/config/passwd" 2>/dev/null || true
sudo chown -R 1883:1883 mosquitto/data mosquitto/log 2>/dev/null \
  || chmod -R 777 mosquitto/data mosquitto/log 2>/dev/null || true

export GIT_COMMIT="$(git rev-parse --short HEAD)"
echo "🏗️  Building app image (GIT_COMMIT=$GIT_COMMIT)..."
if ! docker compose build --no-cache app; then
  echo "❌ Build failed — fix errors above."
  exit 1
fi

echo "🚀 Restarting containers..."
docker compose up -d --force-recreate

sleep 15
echo ""
bash "$APP_DIR/scripts/diagnose.sh"
