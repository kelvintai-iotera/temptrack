const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT) || 8080;
const EMA_ALPHA = 0.35;
const RSSI_TX_POWER = -59;
const PATH_LOSS_N = 2;
const MIN_DISTANCE_M = 0.5;

const GATEWAYS = [
  { gateway_id: 'gw-1', x: 120, y: 80 },
  { gateway_id: 'gw-2', x: 680, y: 90 },
  { gateway_id: 'gw-3', x: 400, y: 520 },
];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

let smoothed = null;
let lastRaw = null;
let simT = 0;

function rssiToWeight(rssi) {
  const exponent = (RSSI_TX_POWER - rssi) / (10 * PATH_LOSS_N);
  const distance = Math.max(MIN_DISTANCE_M, 10 ** exponent);
  return 1 / (distance * distance);
}

function weightedCentroid(readings) {
  let sumW = 0;
  let sumX = 0;
  let sumY = 0;

  for (const reading of readings) {
    const w = rssiToWeight(Number(reading.rssi));
    sumW += w;
    sumX += w * Number(reading.x);
    sumY += w * Number(reading.y);
  }

  if (sumW <= 0) {
    return null;
  }

  return {
    x: sumX / sumW,
    y: sumY / sumW,
  };
}

function applyEma(point) {
  if (!smoothed) {
    smoothed = { x: point.x, y: point.y };
    return smoothed;
  }

  smoothed = {
    x: EMA_ALPHA * point.x + (1 - EMA_ALPHA) * smoothed.x,
    y: EMA_ALPHA * point.y + (1 - EMA_ALPHA) * smoothed.y,
  };
  return smoothed;
}

function distance(ax, ay, bx, by) {
  return Math.max(MIN_DISTANCE_M, Math.hypot(ax - bx, ay - by) / 80);
}

function rssiFromDistance(meters) {
  return RSSI_TX_POWER - 10 * PATH_LOSS_N * Math.log10(meters);
}

function simulatedBeaconPosition(t) {
  const cx = 400;
  const cy = 300;
  const rx = 220;
  const ry = 140;
  return {
    x: cx + rx * Math.cos(t),
    y: cy + ry * Math.sin(t * 2) / 1.4,
  };
}

function buildSimulatedReadings(truePos) {
  return GATEWAYS.map((gateway) => {
    const meters = distance(truePos.x, truePos.y, gateway.x, gateway.y);
    const noise = (Math.random() - 0.5) * 4;
    return {
      gateway_id: gateway.gateway_id,
      rssi: Number((rssiFromDistance(meters) + noise).toFixed(1)),
      x: gateway.x,
      y: gateway.y,
    };
  });
}

function validateReadings(readings) {
  if (!Array.isArray(readings) || readings.length < 3) {
    return 'readings must be an array of at least 3 gateway samples';
  }

  for (const reading of readings) {
    if (
      reading == null
      || typeof reading.gateway_id !== 'string'
      || !Number.isFinite(Number(reading.rssi))
      || !Number.isFinite(Number(reading.x))
      || !Number.isFinite(Number(reading.y))
    ) {
      return 'each reading needs gateway_id, rssi, x, y';
    }
  }

  return null;
}

function processReadings(readings, extras = {}) {
  const raw = weightedCentroid(readings);
  if (!raw) {
    return null;
  }

  lastRaw = raw;
  const filtered = applyEma(raw);
  return {
    x: filtered.x,
    y: filtered.y,
    raw,
    ema: { ...filtered },
    readings,
    gateways: GATEWAYS,
    timestamp: Date.now(),
    ...extras,
  };
}

function broadcast(wss, payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, clients: app.locals.wss ? app.locals.wss.clients.size : 0 });
});

app.get('/api/gateways', (_req, res) => {
  res.json({ gateways: GATEWAYS });
});

app.post('/api/rssi', (req, res) => {
  const readings = req.body && req.body.readings;
  const error = validateReadings(readings);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const payload = processReadings(readings, { source: 'api' });
  if (!payload) {
    res.status(422).json({ error: 'unable to compute position' });
    return;
  }

  broadcast(app.locals.wss, payload);
  res.json(payload);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
app.locals.wss = wss;

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({
    type: 'hello',
    gateways: GATEWAYS,
    x: smoothed ? smoothed.x : 400,
    y: smoothed ? smoothed.y : 300,
    raw: lastRaw,
    timestamp: Date.now(),
  }));
});

setInterval(() => {
  simT += 0.08;
  const truePos = simulatedBeaconPosition(simT);
  const readings = buildSimulatedReadings(truePos);
  const payload = processReadings(readings, {
    source: 'simulator',
    truth: truePos,
  });
  if (payload) {
    broadcast(wss, payload);
  }
}, 250);

server.listen(PORT, () => {
  console.log(`BLE tracker prototype http://localhost:${PORT}`);
  console.log(`WebSocket ws://localhost:${PORT}/ws`);
  console.log('POST /api/rssi  { "readings": [{ "gateway_id", "rssi", "x", "y" }, ...] }');
});
