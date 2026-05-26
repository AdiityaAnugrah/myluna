import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { complaintController } from '../controllers/complaint.controller';
import {
  uploadComplaintPhoto,
  uploadComplaintReplacementProof,
} from '../middlewares/uploadComplaint';

const router = Router();

router.use(auth);

router.get('/eligible-sales', rbac(['USER', 'SUPER_ADMIN']), complaintController.getEligibleSales);
router.post('/', rbac(['USER', 'SUPER_ADMIN']), uploadComplaintPhoto, complaintController.create);
router.get('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getAll);
router.patch('/:id/review', rbac(['TCP', 'SUPER_ADMIN']), complaintController.review);
router.patch(
  '/:id/ship',
  rbac(['TCP', 'SUPER_ADMIN']),
  uploadComplaintReplacementProof,
  complaintController.shipReplacement
);

export default router;
