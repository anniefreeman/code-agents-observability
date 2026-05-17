import { Router } from 'express';
import { asyncHandler } from '../../asyncHandler';
import * as controller from './controller';

const router = Router();

/**
 * @openapi
 * /waitlist:
 *   get:
 *     summary: List waitlist entries (optionally filtered by session or attendee)
 *     tags: [Waitlist]
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: false
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: attendeeName
 *         required: false
 *         schema: { type: string, minLength: 1 }
 *     responses:
 *       200:
 *         description: Array of waitlist entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/WaitlistEntry' }
 *       400:
 *         description: Invalid query
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /waitlist/{id}:
 *   get:
 *     summary: Get a single waitlist entry by id
 *     tags: [Waitlist]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The waitlist entry
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WaitlistEntry' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', asyncHandler(controller.get));

/**
 * @openapi
 * /waitlist:
 *   post:
 *     summary: Join a session's waitlist
 *     tags: [Waitlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NewWaitlistEntry' }
 *     responses:
 *       201:
 *         description: Created waitlist entry
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/WaitlistEntry' }
 *       404:
 *         description: Referenced session not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Session has open seats (book directly), or attendee already on the waitlist
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', asyncHandler(controller.join));

/**
 * @openapi
 * /waitlist/{id}:
 *   delete:
 *     summary: Leave the waitlist (soft delete)
 *     tags: [Waitlist]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Left (no content)
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', asyncHandler(controller.leave));

export default router;
