import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';
import { displayController } from '../controllers/display.controller';

const router = Router();

router.use(auth);
router.use(rbac(['USER', 'ADMIN', 'SUPER_ADMIN']));

router.get('/summary', displayController.summary);

router.get('/categories', displayController.getCategories);
router.post('/categories', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createCategory);
router.put('/categories/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateCategory);

router.get('/suppliers', displayController.getSuppliers);
router.post('/suppliers', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createSupplier);
router.put('/suppliers/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateSupplier);

router.get('/products', displayController.getProducts);
router.post('/products', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.createProduct);
router.put('/products/:id', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.updateProduct);
router.post('/products/:id/adjust-stock', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.adjustStock);

router.get('/movements', displayController.getMovements);

router.get('/requests', displayController.getRequests);
router.post('/requests', displayController.createRequest);
router.post('/requests/:id/review', rbac(['ADMIN', 'SUPER_ADMIN']), displayController.reviewRequest);

export default router;
