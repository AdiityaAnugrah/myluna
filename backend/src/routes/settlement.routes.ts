import { Router } from 'express';
import { settlementController } from '../controllers/settlement.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { uploadProofDocument } from '../middlewares/uploadProofDocument';

const router = Router();

// All routes require authentication
router.use(auth);

// Get statistics (for dashboard)
router.get('/stats', rbac(['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP']), settlementController.getStats);

// Get all settlements with filters
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP']), settlementController.getAll);

// Get settlement by ID
router.get('/:id', rbac(['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP']), settlementController.getById);

// Create new settlement (all authenticated users can create)
router.post('/', rbac(['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP']), uploadProofDocument, settlementController.create);

// Update settlement (SUPER_ADMIN only - enforced in controller)
router.put('/:id', rbac(['SUPER_ADMIN', 'TCP']), uploadProofDocument, settlementController.update);

// Request cancellation (all roles can request, admin approves)
router.post('/:id/request-cancel', rbac(['SUPER_ADMIN', 'ADMIN', 'USER', 'TCP']), settlementController.requestCancellation);

export default router;
