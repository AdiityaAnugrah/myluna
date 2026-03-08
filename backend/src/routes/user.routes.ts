import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';
import { validate } from '../middlewares/validate';
import { userValidators } from '../validators/user.validator';

const router = Router();

// Protect all routes with authentication
router.use(auth);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get('/', userController.getAll);

/**
 * @swagger
 * /users/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 */
router.get('/roles', userController.getRoles);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User retrieved successfully
 */
router.get('/:id', userController.getById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - roleId
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               fullName:
 *                 type: string
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/', checkRole(['SUPER_ADMIN']), validate(userValidators.create), userController.create);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', checkRole(['SUPER_ADMIN']), validate(userValidators.update), userController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete('/:id', checkRole(['SUPER_ADMIN']), userController.delete);

/**
 * @swagger
 * /users/settings:
 *   patch:
 *     summary: Update user settings
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.patch('/settings', userController.updateSettings);

export default router;
