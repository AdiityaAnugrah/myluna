import { Router } from 'express';
import { inventoryLoanController } from '../controllers/inventoryLoan.controller';
import { rbac as checkRole } from '../middlewares/rbac';

const router = Router();

router.get('/', checkRole(['ADMIN_ORDER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.getAll);
router.get('/center-stocks', checkRole(['ADMIN_ORDER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.getCenterStocks);
router.post('/center-stocks/adjustment', checkRole(['ADMIN_ORDER', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.adjustCenterStock);
router.get('/:id', checkRole(['ADMIN_ORDER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.getById);
router.post('/', checkRole(['ADMIN_ORDER', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.create);
router.post('/:id/return', checkRole(['ADMIN_ORDER', 'ADMIN', 'SUPER_ADMIN']), inventoryLoanController.markReturned);

export default router;
