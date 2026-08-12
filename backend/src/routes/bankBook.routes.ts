import { Router } from 'express';
import { bankBookController } from '../controllers/bankBook.controller';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.get('/candidates', rbac(['ADMIN', 'SUPER_ADMIN', 'DEV']), bankBookController.getCandidates);
router.get('/entries', rbac(['ADMIN', 'SUPER_ADMIN', 'DEV']), bankBookController.getEntries);
router.post('/entries', rbac(['ADMIN', 'SUPER_ADMIN', 'DEV']), bankBookController.createEntry);

export default router;
