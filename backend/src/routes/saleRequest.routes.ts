import { Router } from 'express';
import { saleRequestController } from '../controllers/saleRequest.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

// Create request (User)
router.post('/', auth, saleRequestController.create);

// List pending requests (Admin, Super Admin)
router.get('/pending', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), saleRequestController.listPending);

// Approve request (Admin, Super Admin)
router.patch('/:id/approve', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), saleRequestController.approve);

// Reject request (Admin, Super Admin)
router.patch('/:id/reject', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), saleRequestController.reject);

export default router;
