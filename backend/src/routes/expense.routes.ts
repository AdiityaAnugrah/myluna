import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

// All expense routes require authentication
router.use(auth);

// Get all expenses (SUPER_ADMIN and ADMIN only)
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN']), expenseController.getAll);

// Get expense by ID
router.get('/:id', rbac(['SUPER_ADMIN', 'ADMIN']), expenseController.getById);

// Create new expense (SUPER_ADMIN and ADMIN)
router.post('/', rbac(['SUPER_ADMIN', 'ADMIN']), expenseController.create);

// Update expense
router.put('/:id', rbac(['SUPER_ADMIN', 'ADMIN']), expenseController.update);

// Delete expense (SUPER_ADMIN only)
router.delete('/:id', rbac(['SUPER_ADMIN']), expenseController.delete);

export default router;
