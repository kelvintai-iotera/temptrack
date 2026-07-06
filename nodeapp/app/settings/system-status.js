import pkg from '@prisma/client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { c } from '../../config/constant.js';

const prisma = new pkg.PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

function readPackageVersion() {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const json = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return json.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

export async function getSystemStatus({ startedAt, mqttClient, beaconRepository }) {
  const [database, gatewayCount, beaconCount] = await Promise.all([
    checkDatabase(),
    prisma.gateway.count(),
    prisma.beacon.count(),
  ]);

  const mqtt = mqttClient?.getStatus?.() ?? {
    status: 'unknown',
    connected: false,
    host: c.MQTT_HOST,
    port: c.MQTT_PORT,
    subscribedTopics: 0,
  };

  const uptimeSeconds = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;

  const inMemoryGateways = Object.keys(beaconRepository?.getAllGateways?.() ?? {}).length;

  return {
    app: {
      name: 'TempTrack',
      version: readPackageVersion(),
    },
    uptime_seconds: uptimeSeconds,
    database,
    mqtt,
    public: {
      server_ip: process.env.SERVER_PUBLIC_IP || null,
      web_url: process.env.SERVER_PUBLIC_IP
        ? `https://${process.env.SERVER_PUBLIC_IP}:${process.env.NODE_PORT || process.env.PORT || 3011}`
        : null,
      mqtt_url: process.env.SERVER_PUBLIC_IP
        ? `${process.env.SERVER_PUBLIC_IP}:${process.env.MQTT_PORT || 1883}`
        : null,
    },
    counts: {
      gateways: gatewayCount,
      beacons: beaconCount,
      in_memory_gateways: inMemoryGateways,
    },
    server_time: new Date().toISOString(),
  };
}
