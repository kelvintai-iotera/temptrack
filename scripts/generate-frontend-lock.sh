#!/bin/bash
# Generate frontend/package-lock.json (run once on a machine with Docker).
set -e
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Generating frontend/package-lock.json in $APP_DIR/frontend ..."
docker run --rm \
  -v "$APP_DIR/frontend:/frontend" \
  -w /frontend \
  node:18-bullseye-slim \
  npm install --legacy-peer-deps
echo "Done. Commit frontend/package-lock.json if created."
