import { Router } from 'express';
import { saleController } from '../controllers/sale.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';
import { uploadShippingDocument } from '../middlewares/uploadDocument';

const router = Router();

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales
 *     tags: [Sales]
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
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, TRANSFER, CREDIT]
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
 *         description: Sales retrieved successfully
 */
router.get('/', auth, saleController.getAll);

/**
 * @swagger
 * /sales/stats:
 *   get:
 *     summary: Get sale statistics
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sale statistics retrieved successfully
 */
router.get('/stats', auth, saleController.getStats);

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
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
 *         description: Sale retrieved successfully
 */
router.get('/:id', auth, saleController.getById);

/**


/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Create new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - saleNumber
 *               - saleDate
 *               - paymentMethod
 *               - items
 *             properties:
 *               saleNumber:
 *                 type: string
 *               saleDate:
 *                 type: string
 *                 format: date
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, TRANSFER, CREDIT]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *               notes:
 *                 type: string
 *               shippingService:
 *                 type: string
 *                 enum: [JNT_CARGO, JNE_CARGO, HEMAT_CARGO]
 *               shippingAddress:
 *                 type: string
 *               shippingDocument:
 *                  type: string
 *                  format: binary
 *     responses:
 *       201:
 *         description: Sale created successfully
 */
router.post('/', auth, uploadShippingDocument.single('shippingDocument'), saleController.create);

/**
 * @swagger
 * /sales/{id}/approve:
 *   post:
 *     summary: Approve sale
 *     tags: [Sales]
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
 *         description: Sale approved successfully
 */
router.post('/:id/approve', auth, checkRole(['TCP', 'ADMIN', 'SUPER_ADMIN']), saleController.approve);

/**
 * @swagger
 * /sales/{id}/reject:
 *   post:
 *     summary: Reject sale
 *     tags: [Sales]
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
 *         description: Sale rejected successfully
 */
router.post('/:id/reject', auth, checkRole(['TCP', 'ADMIN', 'SUPER_ADMIN']), saleController.reject);

/**
 * @swagger
 * /sales/{id}:
 *   put:
 *     summary: Update sale
 *     tags: [Sales]
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
 *         description: Sale updated successfully
 */
router.put('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), saleController.update);

/**
 * @swagger
 * /sales/{id}:
 *   delete:
 *     summary: Delete sale
 *     tags: [Sales]
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
 *         description: Sale deleted successfully
 */
router.delete('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), saleController.delete);

// Request cancellation (All authenticated users can request)
router.post('/:id/request-cancel', auth, saleController.requestCancellation);

// Process sale (TCP/ADMIN/SUPER_ADMIN) - Changes status to PROCESSED
router.post('/:id/process', auth, checkRole(['TCP', 'ADMIN', 'SUPER_ADMIN']), saleController.process);

export default router;
