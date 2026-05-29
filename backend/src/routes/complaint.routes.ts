import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { complaintController } from '../controllers/complaint.controller';
import { uploadComplaintSubmission } from '../middlewares/uploadComplaint';

const router = Router();

router.use(auth);

router.get('/eligible-sales', rbac(['USER']), complaintController.getEligibleSales);
router.post('/', rbac(['USER']), uploadComplaintSubmission, complaintController.create);
router.get('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getAll);
router.get('/:id/video-metadata', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getVideoMetadata);
router.patch('/:id/claim', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.claim);
router.patch('/:id/mark-handled', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.markHandled);

export default router;
