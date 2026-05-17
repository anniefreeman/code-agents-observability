import { Router } from 'express';
import { asyncHandler } from '../../asyncHandler';
import * as controller from './controller';

const router = Router();

/**
 * @openapi
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/SignupInput' }
 *     responses:
 *       201:
 *         description: Created user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/signup', asyncHandler(controller.signup));

export default router;
