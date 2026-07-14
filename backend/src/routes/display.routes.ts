import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { displayController } from '../controllers/display.controller';

const router = Router();

router.use(auth);
router.use(rbac(['USER', 'ADMIN', 'SUPER_ADMIN', 'TCP']));

router.get('/summary', displayController.summary);

router.get('/categories', displayController.getCategories);
router.post('/categories', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createCategory);
router.put('/categories/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateCategory);

router.get('/suppliers', displayController.getSuppliers);
router.post('/suppliers', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createSupplier);
router.put('/suppliers/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateSupplier);

router.get('/products', displayController.getProducts);
router.get('/products/returnable', displayController.getReturnableProducts);
router.post('/products', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createProduct);
router.put('/products/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateProduct);
router.post('/products/:id/adjust-stock', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.adjustStock);

router.get('/movements', displayController.getMovements);

router.get('/requests', displayController.getRequests);
router.post('/requests', rbac(['USER', 'ADMIN', 'SUPER_ADMIN']), displayController.createRequest);
router.post('/requests/:id/review', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.reviewRequest);

router.get('/returns', displayController.getReturns);
router.post('/returns', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), displayController.createReturn);
router.get('/returns/:id', displayController.getReturnById);
router.post('/returns/:id/status', rbac(['TCP', 'ADMIN', 'SUPER_ADMIN']), displayController.updateReturnStatus);

export default router;
