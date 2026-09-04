import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or SKU
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false, all]
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 */
router.get('/', productController.getAll);

/**
 * @swagger
 * /products/low-stock:
 *   get:
 *     summary: Get low stock products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Low stock products retrieved successfully
 */
router.get('/low-stock', auth, productController.getLowStock);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id', productController.getById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - categoryId
 *               - unit
 *               - purchasePrice
 *               - sellingPrice
 *             properties:
 *               sku:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               unit:
 *                 type: string
 *               purchasePrice:
 *                 type: number
 *               sellingPrice:
 *                 type: number
 *               stock:
 *                 type: integer
 *               minStock:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), productController.create);

router.post('/:id/price-change-requests', auth, checkRole(['USER']), productController.requestPriceChange);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
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
 *         description: Product updated successfully
 */
router.put('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), productController.update);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
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
 *         description: Product deleted successfully
 */
router.delete('/:id', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'USER']), productController.delete);

/**
 * @swagger
 * /products/bulk/delete:
 *   post:
 *     summary: Bulk delete products (soft delete)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Products deleted successfully
 */
router.post('/bulk/delete', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV']), productController.bulkDelete);

/**
 * @swagger
 * /products/bulk/update:
 *   post:
 *     summary: Bulk update products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Products updated successfully
 */
router.post('/bulk/update', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV']), productController.bulkUpdate);

export default router;
