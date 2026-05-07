import express from 'express';
import { financialController } from '../controllers/financial.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = express.Router();

// All financial routes require authentication
router.use(auth);

// SUPER_ADMIN and ADMIN can view financial summary and breakdowns
router.get('/', rbac(['SUPER_ADMIN', 'ADMIN']), financialController.getSummary);
router.get('/omset-breakdown', rbac(['SUPER_ADMIN', 'ADMIN']), financialController.getOmsetBreakdown);

// Only SUPER_ADMIN can set initial balance
router.post('/initial-receivable', rbac(['SUPER_ADMIN']), financialController.setInitialBalance);

// SUPER_ADMIN can bulk import historical settlements from Excel
router.post('/import-settlements', rbac(['SUPER_ADMIN']), financialController.importSettlements);
router.post('/import-other-incomes', rbac(['SUPER_ADMIN']), financialController.importOtherIncomes);
router.post('/historical-settlement', rbac(['SUPER_ADMIN']), financialController.createHistoricalSettlement);

export default router;
