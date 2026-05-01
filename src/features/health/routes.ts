import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /ping:
 *   get:
 *     summary: Liveness check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Pong
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: pong }
 */
router.get('/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Service health and uptime
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number, example: 12.34 }
 *                 timestamp: { type: string, format: date-time }
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
