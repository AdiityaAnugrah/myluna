import { Router } from 'express';
import { changeRequestController } from '../controllers/changeRequest.controller';
import { auth } from '../middlewares/auth';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

// List pending requests (Admin, Super Admin)
router.get('/pending', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV']), changeRequestController.listPending);

// Create a new change request (USER for stock adjustment approval flow)
router.post('/', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV', 'USER']), changeRequestController.create);

// Approve request (Admin, Super Admin)
router.patch('/:id/approve', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV']), changeRequestController.approve);

// Reject request (Admin, Super Admin)
router.patch('/:id/reject', auth, checkRole(['ADMIN', 'SUPER_ADMIN', 'DEV']), changeRequestController.reject);

export default router;
