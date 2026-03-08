import { Router } from 'express';
import { purchaseController } from '../controllers/purchase.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

/**
 * @swagger
 * /purchases:
 *   get:
 *     summary: Get all purchases
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, COMPLETED, CANCELLED]
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Purchases retrieved successfully
 */
router.get('/', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), purchaseController.getAll);

/**
 * @swagger
 * /purchases/{id}:
 *   get:
 *     summary: Get purchase by ID
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase retrieved successfully
 */
router.get('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), purchaseController.getById);

/**
 * @swagger
 * /purchases:
 *   post:
 *     summary: Create new purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchaseNumber
 *               - supplierId
 *               - purchaseDate
 *               - items
 *             properties:
 *               purchaseNumber:
 *                 type: string
 *               supplierId:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                     price:
 *                       type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Purchase created successfully
 */
router.post('/', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), purchaseController.create);

/**
 * @swagger
 * /purchases/{id}:
 *   put:
 *     summary: Update purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase updated successfully
 */
router.put('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), purchaseController.update);

/**
 * @swagger
 * /purchases/{id}:
 *   delete:
 *     summary: Delete purchase
 *     tags: [Purchases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Purchase deleted successfully
 */
router.delete('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), purchaseController.delete);

export default router;
