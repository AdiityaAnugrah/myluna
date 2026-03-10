import express from 'express';
import { financialController } from '../controllers/financial.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = express.Router();

// All financial routes require authentication
router.use(auth);

// SUPER_ADMIN and ADMIN can view financial summary
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN']), financialController.getSummary);

// Only SUPER_ADMIN can set initial balance
router.post('/initial-receivable', rbac(['SUPER_ADMIN']), financialController.setInitialBalance);

export default router;
