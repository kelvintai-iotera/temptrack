#!/bin/bash

# Configuration
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "🚀 Starting deployment for eLogbook in $APP_DIR..."

# 1. Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo '❌ Error: docker is not installed.' >&2
  echo 'Please run: sudo apt-get update && sudo apt-get install docker.io -y'
  exit 1
fi

# 2. Fix root-owned build artifacts (blocks git pull)
bash "$APP_DIR/scripts/fix-permissions.sh" 2>/dev/null || true
chmod +x "$APP_DIR/scripts/fix-permissions.sh" 2>/dev/null || true

# 3. Setup Environment Files
echo "📝 Checking environment files..."
if [ ! -f "$APP_DIR/.env" ]; then
    echo "⚠️  Root .env missing, copying from .env.default..."
    cp "$APP_DIR/.env.default" "$APP_DIR/.env"
fi

# Repair glued MQTT_HOST+JWT_SECRET lines (missing newline on append)
bash "$APP_DIR/scripts/repair-env.sh" 2>/dev/null || true

# HTTPS on 3011 by default
if ! grep -q '^USE_HTTP=' "$APP_DIR/.env" 2>/dev/null; then
    echo "USE_HTTP=0" >> "$APP_DIR/.env"
elif grep -q '^USE_HTTP=1' "$APP_DIR/.env" 2>/dev/null; then
    sed -i 's/^USE_HTTP=1/USE_HTTP=0/' "$APP_DIR/.env"
    echo "ℹ️  Switched USE_HTTP to 0 (HTTPS on port 3011)"
fi

# Ensure JWT_SECRET exists and is long enough
if ! grep -q '^JWT_SECRET=.\{32,\}' "$APP_DIR/.env" 2>/dev/null; then
    if grep -q '^JWT_SECRET=' "$APP_DIR/.env" 2>/dev/null; then
        sed -i '/^JWT_SECRET=/d' "$APP_DIR/.env"
    fi
    echo "🔐 Generating JWT_SECRET..."
    printf '\nJWT_SECRET=%s\n' "$(openssl rand -hex 32)" >> "$APP_DIR/.env"
fi

# Load root env for downstream files
set -a
# shellcheck disable=SC1091
source "$APP_DIR/.env"
set +a

MQTT_USER="${MQTT_USER:-temptrack}"
MQTT_PASSWORD="${MQTT_PASSWORD:-changeme_mqtt_please_rotate}"

if [ "$MQTT_PASSWORD" = "changeme_mqtt_please_rotate" ]; then
    echo "⚠️  Warning: using default MQTT_PASSWORD — change MQTT_PASSWORD in .env for production"
fi

if [ ! -f "$APP_DIR/nodeapp/.env" ]; then
    echo "⚠️  Nodeapp .env missing, copying from nodeapp/.env.default..."
    cp "$APP_DIR/nodeapp/.env.default" "$APP_DIR/nodeapp/.env"
fi

if [ -f "$APP_DIR/nodeapp/.env" ]; then
    # Keep nodeapp/.env in sync with root secrets after upgrades
    for pair in "JWT_SECRET=${JWT_SECRET}" "MQTT_USER=${MQTT_USER}" "MQTT_PASSWORD=${MQTT_PASSWORD}"; do
        key="${pair%%=*}"
        val="${pair#*=}"
        if grep -q "^${key}=" "$APP_DIR/nodeapp/.env" 2>/dev/null; then
            sed -i "s|^${key}=.*|${key}=${val}|" "$APP_DIR/nodeapp/.env"
        else
            echo "${key}=${val}" >> "$APP_DIR/nodeapp/.env"
        fi
    done
fi

chmod +x "$APP_DIR/mosquitto/config/docker-entrypoint.sh" 2>/dev/null || true
chmod +x "$APP_DIR/scripts/repair-env.sh" 2>/dev/null || true
chmod +x "$APP_DIR/nodeapp/bin/docker-start.sh" 2>/dev/null || true
chmod +x "$APP_DIR/nodeapp/bin/ensure-runtime-env.sh" 2>/dev/null || true
chmod +x "$APP_DIR/scripts/diagnose.sh" 2>/dev/null || true
chmod +x "$APP_DIR/scripts/fix-permissions.sh" 2>/dev/null || true

# Mosquitto data/log must be writable by UID 1883 inside the container
mkdir -p "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log"
sudo rm -f "$APP_DIR/mosquitto/config/passwd" 2>/dev/null || rm -f "$APP_DIR/mosquitto/config/passwd" 2>/dev/null || true
sudo chown -R 1883:1883 "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log" 2>/dev/null \
  || chmod -R 777 "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log"

# 4. Stop existing containers
echo "🛑 Stopping existing services..."
docker compose -f "$APP_DIR/docker-compose.yml" down

# 5. Build and Start
echo "🏗️  Building and starting containers..."
export GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
echo "   GIT_COMMIT=$GIT_COMMIT"
docker compose -f "$APP_DIR/docker-compose.yml" build --no-cache app
docker compose -f "$APP_DIR/docker-compose.yml" up -d --force-recreate app

# 6. Status check
echo "📊 Deployment complete! Current status:"
docker compose -f "$APP_DIR/docker-compose.yml" ps

echo "------------------------------------------------"
echo "✅ eLogbook is now running!"
echo "📍 Access GUI at: https://<your-server-ip>:3011"
echo "   (accept the self-signed certificate warning in your browser)"
echo "🔧 Troubleshoot:  bash scripts/diagnose.sh"
echo "🔑 Ensure JWT_SECRET and MQTT_PASSWORD are set in .env"
echo "------------------------------------------------"
