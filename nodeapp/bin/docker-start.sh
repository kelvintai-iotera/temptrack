#!/bin/sh
# Container entrypoint: env setup, optional frontend rebuild, migrate, start app.
set -e

cd /app
chmod +x bin/ensure-runtime-env.sh 2>/dev/null || true
. ./bin/ensure-runtime-env.sh

# Backend dependencies (image already includes node_modules)
if [ ! -d node_modules ] || [ ! -f node_modules/.install-stamp ]; then
  echo "[docker-start] Installing backend dependencies..."
  npm install
  touch node_modules/.install-stamp
fi

# Frontend rebuild ONLY when /frontend is bind-mounted (dev) or FORCE_FRONTEND_BUILD=1
FRONTEND_MOUNTED=0
if mountpoint -q /frontend 2>/dev/null; then
  FRONTEND_MOUNTED=1
fi

if [ "$FRONTEND_MOUNTED" = "1" ] || [ "$FORCE_FRONTEND_BUILD" = "1" ]; then
  if [ -f /frontend/package.json ]; then
    cd /frontend
    if [ ! -d node_modules ] || [ ! -f node_modules/.install-stamp ]; then
      echo "[docker-start] Installing frontend dependencies..."
      npm install
      touch node_modules/.install-stamp
    fi

    NEED_BUILD=0
    if [ ! -f /app/public/index.html ]; then
      NEED_BUILD=1
    elif [ "$FORCE_FRONTEND_BUILD" = "1" ]; then
      NEED_BUILD=1
    elif [ "$FRONTEND_MOUNTED" = "1" ] && find /frontend/src -newer /app/public/index.html -print -quit 2>/dev/null | grep -q .; then
      NEED_BUILD=1
    fi

    if [ "$NEED_BUILD" = "1" ]; then
      echo "[docker-start] Building frontend..."
      mkdir -p /app/public
      if ! VITE_BUILD_OUT_DIR=/app/public npm run build; then
        echo "[docker-start] ERROR: frontend build failed"
        exit 1
      fi
    else
      echo "[docker-start] Frontend build up to date, skipping."
    fi
    cd /app
  fi
elif [ -f /app/public/index.html ]; then
  echo "[docker-start] Using frontend baked into image."
else
  echo "[docker-start] ERROR: /app/public/index.html missing — rebuild image with: docker compose build --no-cache app"
  exit 1
fi

mkdir -p /app/public

echo "[docker-start] Running database migrations..."
MIGRATE_OK=0
for attempt in 1 2 3 4 5; do
  if npx prisma migrate deploy; then
    MIGRATE_OK=1
    break
  fi
  echo "[docker-start] migrate failed, retry in 5s ($attempt/5)..."
  sleep 5
done
if [ "$MIGRATE_OK" != "1" ]; then
  echo "[docker-start] ERROR: prisma migrate deploy failed"
  exit 1
fi

echo "[docker-start] Generating Prisma client..."
npx prisma generate

mkdir -p /app/uploads/floor-plan

echo "[docker-start] Seeding database (admin user, params, sample data)..."
if ! npx prisma db seed; then
  echo "[docker-start] WARN: prisma db seed failed (may be OK if already seeded)"
fi

echo "[docker-start] Starting application (USE_HTTP=${USE_HTTP:-0}, PORT=${PORT:-3011})..."
exec npm run prod
