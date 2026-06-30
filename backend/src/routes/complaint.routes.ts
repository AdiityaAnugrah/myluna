import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { complaintController } from '../controllers/complaint.controller';
import { uploadComplaintSubmission } from '../middlewares/uploadComplaint';

const router = Router();

router.use(auth);

router.get('/eligible-sales', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.getEligibleSales);
router.get('/summary', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getSummary);
router.post('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), uploadComplaintSubmission, complaintController.create);
router.get('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getAll);
router.patch('/:id/claim', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.claim);
router.patch('/:id/mark-handled', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.markHandled);
router.patch('/:id/complete', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.complete);

export default router;
