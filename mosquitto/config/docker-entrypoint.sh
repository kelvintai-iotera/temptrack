#!/bin/sh
set -e

MOSQUITTO_UID=1883
MOSQUITTO_GID=1883
PASSWD_FILE="/mosquitto/config/passwd"
MQTT_USER="${MQTT_USER:-temptrack}"
MQTT_PASSWORD="${MQTT_PASSWORD:-changeme_mqtt_please_rotate}"

mkdir -p /mosquitto/data /mosquitto/log

chown -R "$MOSQUITTO_UID:$MOSQUITTO_GID" /mosquitto/data /mosquitto/log 2>/dev/null \
  || chmod -R 777 /mosquitto/data /mosquitto/log

if [ -f "$PASSWD_FILE" ] && [ -s "$PASSWD_FILE" ]; then
  mosquitto_passwd -b "$PASSWD_FILE" "$MQTT_USER" "$MQTT_PASSWORD"
else
  rm -f "$PASSWD_FILE"
  mosquitto_passwd -b -c "$PASSWD_FILE" "$MQTT_USER" "$MQTT_PASSWORD"
fi

chmod 600 "$PASSWD_FILE" 2>/dev/null || true

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
