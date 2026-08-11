import { Router } from 'express';
import { bankBookController } from '../controllers/bankBook.controller';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.get('/candidates', rbac(['ADMIN', 'SUPER_ADMIN', 'DEV']), bankBookController.getCandidates);

export default router;
