const router = require('express').Router();
const controller = require('./controller');

/**
 * @openapi
 * /sessions:
 *   get:
 *     summary: List all sessions
 *     tags: [Sessions]
 *     responses:
 *       200:
 *         description: Array of sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Session' }
 */
router.get('/', controller.list);

/**
 * @openapi
 * /sessions/{id}:
 *   get:
 *     summary: Get a single session by id
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The session
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Session' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', controller.get);

/**
 * @openapi
 * /sessions:
 *   post:
 *     summary: Create a session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NewSession' }
 *     responses:
 *       201:
 *         description: Created session
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Session' }
 */
router.post('/', controller.create);

/**
 * @openapi
 * /sessions/{id}:
 *   put:
 *     summary: Update a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/NewSession' }
 *     responses:
 *       200:
 *         description: Updated session
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Session' }
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:id', controller.update);

/**
 * @openapi
 * /sessions/{id}:
 *   delete:
 *     summary: Delete a session
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted (no content)
 *       404:
 *         description: Not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', controller.remove);

module.exports = router;
