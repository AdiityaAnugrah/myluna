import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { complaintController } from '../controllers/complaint.controller';
import { uploadComplaintSubmission } from '../middlewares/uploadComplaint';
import { validateUploadedFilesContent } from '../utils/uploadSecurity';

const router = Router();

router.use(auth);

router.get('/eligible-sales', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.getEligibleSales);
router.get('/summary', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getSummary);
router.post('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), uploadComplaintSubmission, validateUploadedFilesContent, complaintController.create);
router.get('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getAll);
router.get('/:id', rbac(['USER', 'SUPER_ADMIN', 'ADMIN', 'TCP']), complaintController.getById);
router.patch('/:id/decision', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.setDecision);
router.patch('/:id/settlement-deduction', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.recordSettlementDeduction);
router.patch('/:id/component-shipment', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.processComponentShipment);
router.post('/:id/convert-to-return', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.convertToReturn);
router.patch('/:id/claim', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.claim);
router.patch('/:id/mark-handled', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), complaintController.markHandled);
router.patch('/:id/request-follow-up', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.requestFollowUp);
router.patch('/:id/confirm-delivered', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.confirmDelivered);
router.patch('/:id/close-case', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.closeCase);
router.patch('/:id/complete', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), complaintController.complete);

export default router;
