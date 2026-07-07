#!/bin/sh
set -e

MOSQUITTO_UID=1883
MOSQUITTO_GID=1883

mkdir -p /mosquitto/data /mosquitto/log

chown -R "$MOSQUITTO_UID:$MOSQUITTO_GID" /mosquitto/data /mosquitto/log 2>/dev/null \
  || chmod -R 777 /mosquitto/data /mosquitto/log

# No passwd file — gateways on the LAN connect without MQTT authentication.
rm -f /mosquitto/config/passwd 2>/dev/null || true

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
