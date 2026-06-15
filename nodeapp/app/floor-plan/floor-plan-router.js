import express from 'express';
import { loggerFactory } from '../../config/logger.js';
import { authMiddleware, adminMiddleware } from '../auth/auth-middleware.js';
import { FloorPlanService } from './floor-plan-service.js';

const logger = loggerFactory('floor-plan-router');
const jsonLarge = express.json({ limit: '12mb' });

function addFloorPlanRouter() {
  const router = express.Router();
  const service = new FloorPlanService();

  router.get('/', authMiddleware, async (req, res) => {
    try {
      res.json(await service.getState());
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'Failed to load floor plan' });
    }
  });

  router.get('/image', authMiddleware, async (req, res) => {
    try {
      const imagePath = await service.getImagePath();
      if (!imagePath) {
        return res.status(404).json({ error: 'No floor plan uploaded' });
      }
      const state = await service.getState();
      res.type(state.mimeType || 'image/png');
      return res.sendFile(imagePath);
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ error: 'Failed to load floor plan image' });
    }
  });

  router.post('/upload', authMiddleware, adminMiddleware, jsonLarge, async (req, res) => {
    try {
      const meta = await service.saveImage({
        dataUrl: req.body?.dataUrl,
        originalName: req.body?.fileName,
      });
      res.json({ ok: true, meta });
    } catch (e) {
      logger.error(e);
      res.status(400).json({ error: e.message || 'Upload failed' });
    }
  });

  router.patch('/gateways/:id/position', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const gateway = await service.updateGatewayPosition(
        req.params.id,
        req.body?.plan_x,
        req.body?.plan_y,
      );
      res.json(gateway);
    } catch (e) {
      logger.error(e);
      res.status(400).json({ error: e.message || 'Failed to save position' });
    }
  });

  router.delete('/gateways/:id/position', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const gateway = await service.clearGatewayPosition(req.params.id);
      res.json(gateway);
    } catch (e) {
      logger.error(e);
      res.status(400).json({ error: e.message || 'Failed to clear position' });
    }
  });

  return router;
}

export { addFloorPlanRouter };
