import { Router } from 'express';
import { returnController } from '../controllers/return.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { uploadReturnPhotos } from '../middlewares/uploadReturn';
import { validateUploadedFilesContent } from '../utils/uploadSecurity';

const router = Router();

router.use(auth);

router.get('/eligible-sales', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), returnController.getEligibleSales);
router.get('/summary', rbac(['USER', 'TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.getSummary);
router.post('/', rbac(['USER', 'SUPER_ADMIN', 'ADMIN']), uploadReturnPhotos, validateUploadedFilesContent, returnController.create);
router.get('/', rbac(['USER', 'TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.getAll);
router.get('/:id', rbac(['USER', 'TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.getById);
router.patch('/:id/review', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.review);
router.patch('/:id/receive', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), uploadReturnPhotos, validateUploadedFilesContent, returnController.receive);
router.patch('/:id/restock', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.restock);
router.patch('/:id/damaged', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.damaged);
router.patch('/:id/resend', rbac(['TCP', 'SUPER_ADMIN', 'ADMIN']), returnController.resend);

export default router;
