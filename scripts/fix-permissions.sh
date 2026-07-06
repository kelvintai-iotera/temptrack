#!/bin/bash
# Docker often creates nodeapp/public as root — blocks git pull and causes deploy issues.
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
USER_NAME="$(whoami)"

echo "Fixing permissions in $APP_DIR ..."

fix_owner() {
  path="$1"
  [ -e "$path" ] || return 0
  if sudo chown -R "$USER_NAME:$USER_NAME" "$path" 2>/dev/null; then
    echo "  chown $path"
  elif chown -R "$USER_NAME:$USER_NAME" "$path" 2>/dev/null; then
    echo "  chown $path"
  else
    echo "  warn: could not chown $path (may need sudo)"
  fi
}

fix_owner "$APP_DIR/nodeapp/public"
fix_owner "$APP_DIR/nodeapp/node_modules"
fix_owner "$APP_DIR/frontend/node_modules"

# Mosquitto runs as UID 1883 — passwd/data/log must be readable/writable
if [ -d "$APP_DIR/mosquitto" ]; then
  mkdir -p "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log"
  if sudo chown -R 1883:1883 "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log" 2>/dev/null; then
    echo "  chown mosquitto data/log to 1883:1883"
  else
    chmod -R 777 "$APP_DIR/mosquitto/data" "$APP_DIR/mosquitto/log" 2>/dev/null || true
    echo "  chmod 777 mosquitto data/log (fallback)"
  fi
  if [ -f "$APP_DIR/mosquitto/config/passwd" ]; then
    sudo chown 1883:1883 "$APP_DIR/mosquitto/config/passwd" 2>/dev/null \
      || chown 1883:1883 "$APP_DIR/mosquitto/config/passwd" 2>/dev/null \
      || chmod 644 "$APP_DIR/mosquitto/config/passwd" 2>/dev/null \
      || true
    echo "  fixed mosquitto config/passwd ownership"
  fi
fi

if [ -d "$APP_DIR/nodeapp/public" ]; then
  echo "  removing nodeapp/public (rebuilt inside Docker image)"
  rm -rf "$APP_DIR/nodeapp/public" 2>/dev/null || sudo rm -rf "$APP_DIR/nodeapp/public"
fi

echo "Done."
