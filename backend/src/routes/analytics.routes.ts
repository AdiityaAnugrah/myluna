import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.get('/sales', auth, rbac(['SUPER_ADMIN', 'ADMIN']), analyticsController.getSalesAnalytics);

export default router;
