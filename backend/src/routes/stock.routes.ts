import { Router } from 'express';
import { stockController } from '../controllers/stock.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

/**
 * @swagger
 * /stock/movements:
 *   get:
 *     summary: Get stock movements
 *     tags: [Stock]
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
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [IN, OUT, ADJUSTMENT]
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
 *         description: Stock movements retrieved successfully
 */
router.get('/movements', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), stockController.getMovements);

/**
 * @swagger
 * /stock/adjustment:
 *   post:
 *     summary: Create stock adjustment
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 description: Positive for increase, negative for decrease
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Stock adjustment created successfully
 */
router.post('/adjustment', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), stockController.createAdjustment);

/**
 * @swagger
 * /stock/report:
 *   get:
 *     summary: Get stock report
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stock report generated successfully
 */
router.get('/report', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), stockController.getStockReport);

export default router;
