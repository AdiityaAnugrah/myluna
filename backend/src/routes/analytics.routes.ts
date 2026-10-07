import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.get('/operations', auth, rbac(['SUPER_ADMIN', 'ADMIN', 'ADMIN_ORDER', 'TCP', 'USER', 'DEV']), analyticsController.getOperationalSummary);
router.get('/sales', auth, rbac(['SUPER_ADMIN', 'ADMIN', 'DEV']), analyticsController.getSalesAnalytics);
router.get('/unmapped-sales', auth, rbac(['SUPER_ADMIN', 'ADMIN', 'DEV']), analyticsController.getUnmappedSales);

export default router;
