# Stage 1 — frontend production build (baked into image)
FROM node:18-bullseye-slim AS frontend-build
ARG GIT_COMMIT=unknown
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json* frontend/.npmrc* ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN mkdir -p /build/public \
    && VITE_BUILD_OUT_DIR=/build/public npm run build \
    && printf '%s\n' "$GIT_COMMIT" > /build/public/build-version.txt \
    && grep -rq 'history/query' /build/public/assets/ \
    && grep -rq 'floor-plan' /build/public/assets/ \
    || (echo "ERROR: frontend build missing History or Floor Plan — run: docker compose build --no-cache app" && exit 1)

# Stage 2 — backend dependencies
FROM node:18-bullseye-slim AS app-deps
WORKDIR /app
COPY nodeapp/package.json nodeapp/package-lock.json* ./
RUN npm ci --omit=dev 2>/dev/null || npm install --omit=dev
RUN touch node_modules/.install-stamp

# Stage 3 — runtime image
FROM node:18-bullseye-slim
WORKDIR /app

RUN npm install -g pm2

COPY --from=app-deps /app/node_modules ./node_modules
COPY nodeapp/ ./
COPY --from=frontend-build /build/public ./public

RUN chmod +x bin/docker-start.sh bin/ensure-runtime-env.sh 2>/dev/null || true

EXPOSE 3011
CMD ["/bin/sh", "bin/docker-start.sh"]
