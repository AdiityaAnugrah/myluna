import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { auth } from '../middlewares/auth';

const router = Router();

// Retrieve logs - Accessible by all authenticated users
router.get('/', auth, auditController.getLogs);
router.get('/stats/daily', auth, auditController.getDailyStats);

export default router;
