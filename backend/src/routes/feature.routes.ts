import { Router } from 'express';
import { featureController } from '../controllers/feature.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.use(auth);

router.get('/', featureController.getAll);
router.patch('/:id', rbac(['DEV']), featureController.update);

export default router;
