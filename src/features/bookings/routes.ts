import { Router } from 'express';
import { asyncHandler } from '../../asyncHandler';
import * as controller from './controller';

const router = Router();

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: List bookings (optionally filtered by attendee)
 *     tags: [Bookings]
 *     parameters:
 *       - in: query
 *         name: attendeeName
 *         required: false
 *         schema: { type: string, minLength: 1 }
 *         description: Restrict results to bookings made by this attendee. Includes cancelled bookings.
 *     responses:
 *       200:
 *         description: Array of bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Booking' }
 *       400:
 *         description: Invalid query
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', asyncHandler(controller.list));

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     summary: Get a single booking by id
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The booking
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Booking' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', asyncHandler(controller.get));

/**
 * @openapi
 * /bookings:
 *   post:
 *     summary: Create a booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NewBooking' }
 *     responses:
 *       201:
 *         description: Created booking
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Booking' }
 *       404:
 *         description: Referenced session not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Session is full, or attendee already has a confirmed booking
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', asyncHandler(controller.create));

/**
 * @openapi
 * /bookings/{id}:
 *   delete:
 *     summary: Cancel a booking (soft delete)
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Cancelled (no content)
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', asyncHandler(controller.remove));

export default router;
