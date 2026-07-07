#!/bin/bash
# Check whether physical gateways are publishing MQTT to this server.
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

SERVER_IP="10.0.56.200"
MQTT_PORT="1883"
if [ -f .env ]; then
  _ip=$(grep '^SERVER_PUBLIC_IP=' .env 2>/dev/null | cut -d= -f2-)
  [ -n "$_ip" ] && SERVER_IP="$_ip"
  _port=$(grep '^MQTT_PORT=' .env 2>/dev/null | cut -d= -f2-)
  [ -n "$_port" ] && MQTT_PORT="$_port"
fi

echo "=============================================="
echo " MQTT ingest check — $APP_DIR"
echo "=============================================="
echo ""
echo "Gateway devices must publish to: ${SERVER_IP}:${MQTT_PORT}"
echo "(If they still use the old IP 10.0.56.130, no data will arrive.)"
echo ""

echo "=== Registered gateways (DB) ==="
docker compose exec -T postgresql-db psql -U docker -d elogbook -t -A -F' | ' \
  -c 'SELECT id, mac_addr FROM gateway ORDER BY id;' 2>/dev/null \
  || echo "  (could not query database)"
echo ""

echo "=== Expected MQTT topics ==="
docker compose exec -T postgresql-db psql -U docker -d elogbook -t -A \
  -c "SELECT '/' || mac_addr || '/connect_packet/adv_publish' FROM gateway ORDER BY id;" 2>/dev/null \
  | while read -r topic; do
    [ -n "$topic" ] && echo "  $topic"
  done
echo ""

echo "=== mqtt-broker container ==="
docker compose ps mqtt-broker 2>/dev/null || true
echo ""

echo "=== Recent mosquitto log (connections / publish) ==="
docker compose exec -T mqtt-broker sh -c 'tail -40 /mosquitto/log/mosquitto.log 2>/dev/null || echo "(no log file yet)"'
echo ""

echo "=== App MQTT status (from logs) ==="
docker compose logs app --tail 30 2>/dev/null | grep -iE 'mqtt|gateway|subscribe' || echo "  (no mqtt lines)"
echo ""

echo "=== Live listen test (20 seconds) ==="
echo "Waiting for gateway publishes on /+/connect_packet/adv_publish ..."
echo "(Press Ctrl+C to stop early)"
echo ""
timeout 20 docker compose exec -T mqtt-broker mosquitto_sub \
  -h 127.0.0.1 -p 1883 \
  -t '/+/connect_packet/adv_publish' -v 2>/dev/null \
  || true

echo ""
echo "=============================================="
if timeout 1 docker compose exec -T mqtt-broker mosquitto_sub \
  -h 127.0.0.1 -p 1883 -t '/+/connect_packet/adv_publish' -C 1 -W 1 >/dev/null 2>&1; then
  echo "✅ MQTT messages detected — data path is working."
else
  echo "❌ No MQTT messages in the last 20s."
  echo ""
  echo "Fix on each physical gateway:"
  echo "  1. MQTT broker / server = ${SERVER_IP}"
  echo "  2. Port = ${MQTT_PORT}"
  echo "  3. Username / password = leave empty (or any value — auth disabled on LAN)"
  echo "  4. MAC must match Settings → Gateways"
  echo ""
  echo "Also check: gateway powered on, same LAN as server, firewall allows ${MQTT_PORT}."
fi
echo "=============================================="
