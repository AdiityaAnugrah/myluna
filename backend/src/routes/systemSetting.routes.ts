import { Router } from 'express';
import { systemSettingController } from '../controllers/systemSetting.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.use(auth);

router.get('/', rbac(['DEV']), systemSettingController.getAll);
router.patch('/:key', rbac(['DEV']), systemSettingController.update);

export default router;
