# TempTrack (eLogbook)

IoT beacon temperature monitoring — real-time dashboard, MQTT ingestion, PostgreSQL storage.

## Quick deploy (Ubuntu + Docker)

```bash
git clone https://github.com/iotdev2251/eLogbook.git
cd eLogbook
cp .env.default .env
bash scripts/deploy.sh
```

Access: **https://10.0.56.200:3011** (self-signed cert — accept the browser warning)

Set `SERVER_PUBLIC_IP` in `.env` if the server IP changes. Physical gateways use `SERVER_PUBLIC_IP:1883` for MQTT.

Login: `admin` / `admin123` — change in production.

Troubleshoot: `bash scripts/diagnose.sh`

## Environment files

| File | Purpose |
|------|---------|
| `.env` | Docker Compose (Postgres, MQTT, ports, `JWT_SECRET`) |
| `nodeapp/.env` | Node app runtime (copy from `nodeapp/.env.default`) |

**Important:** Each variable must be on its own line. If MQTT fails with `ENOTFOUND mqtt-brokerjwt_secret=...`, run:

```bash
bash scripts/repair-env.sh
```

## Manual Docker

```bash
cp .env.default .env
cp nodeapp/.env.default nodeapp/.env
bash scripts/repair-env.sh
docker compose up --build -d
```

Force frontend rebuild after UI changes:

```bash
FORCE_FRONTEND_BUILD=1 docker compose up -d --build app
```

## Documentation

- [TempTrack_UpdateStatus.md](TempTrack_UpdateStatus.md) — deployment & change log (中文)
- [TempTrack_NewFeatures.md](TempTrack_NewFeatures.md) — feature log (中文)
- [nodeapp/prisma/schema.prisma](nodeapp/prisma/schema.prisma) — database schema

## Development

```bash
# Backend (HTTPS on 3011)
cd nodeapp && npm install && npm run dev

# Frontend (Vite proxy → localhost:3011)
cd frontend && npm install && npm run dev
```

## Tests & CI

```bash
cd nodeapp && npm test
cd frontend && npm test && npm run build
```

GitHub Actions runs these on every push to `main`.
