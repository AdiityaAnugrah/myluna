import { Router } from 'express';
import { productRequestController } from '../controllers/productRequest.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

// Create request (User)
router.post('/', auth, productRequestController.create);

// List pending requests (Admin, Super Admin)
router.get('/pending', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), productRequestController.listPending);

// Approve request (Admin, Super Admin)
router.patch('/:id/approve', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), productRequestController.approve);

// Reject request (Admin, Super Admin)
router.patch('/:id/reject', auth, checkRole(['ADMIN', 'SUPER_ADMIN']), productRequestController.reject);

export default router;
