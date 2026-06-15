import { mkdir, readFile, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@prisma/client';

const prisma = new pkg.PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/floor-plan');
const META_PATH = path.join(UPLOAD_DIR, 'meta.json');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024;

const EXT_BY_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function readMeta() {
  try {
    const raw = await readFile(META_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) {
    throw new Error('Invalid image upload. Use PNG, JPEG, or WebP.');
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error('Unsupported file type. Use PNG, JPEG, or WebP. PDF support is planned.');
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > MAX_BYTES) {
    throw new Error('Image too large (max 10 MB).');
  }
  if (buffer.length < 64) {
    throw new Error('Image file is empty or corrupt.');
  }
  return { mime, buffer };
}

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

class FloorPlanService {
  async getState() {
    const meta = await readMeta();
    const gateways = await prisma.gateway.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        mac_addr: true,
        plan_x: true,
        plan_y: true,
      },
    });

    return {
      hasPlan: Boolean(meta?.fileName),
      mimeType: meta?.mimeType || null,
      fileName: meta?.fileName || null,
      updatedAt: meta?.updatedAt || null,
      gateways,
    };
  }

  async getImagePath() {
    const meta = await readMeta();
    if (!meta?.fileName) return null;
    return path.join(UPLOAD_DIR, meta.fileName);
  }

  async saveImage({ dataUrl, originalName }) {
    const { mime, buffer } = parseDataUrl(dataUrl);
    await ensureUploadDir();

    const meta = await readMeta();
    if (meta?.fileName) {
      try {
        await unlink(path.join(UPLOAD_DIR, meta.fileName));
      } catch {
        /* ignore */
      }
    }

    const ext = EXT_BY_MIME[mime] || 'png';
    const fileName = `plan.${ext}`;
    await writeFile(path.join(UPLOAD_DIR, fileName), buffer);
    const nextMeta = {
      fileName,
      mimeType: mime,
      originalName: String(originalName || fileName).slice(0, 255),
      updatedAt: new Date().toISOString(),
    };
    await writeFile(META_PATH, JSON.stringify(nextMeta, null, 2));
    return nextMeta;
  }

  async updateGatewayPosition(gatewayId, plan_x, plan_y) {
    const x = clampPercent(plan_x);
    const y = clampPercent(plan_y);
    if (x == null || y == null) {
      throw new Error('Position must be numbers between 0 and 100');
    }

    return prisma.gateway.update({
      where: { id: gatewayId },
      data: { plan_x: x, plan_y: y },
      select: {
        id: true,
        name: true,
        mac_addr: true,
        plan_x: true,
        plan_y: true,
      },
    });
  }

  async clearGatewayPosition(gatewayId) {
    return prisma.gateway.update({
      where: { id: gatewayId },
      data: { plan_x: null, plan_y: null },
      select: {
        id: true,
        name: true,
        mac_addr: true,
        plan_x: true,
        plan_y: true,
      },
    });
  }
}

export { FloorPlanService };
