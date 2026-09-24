import { Router } from 'express';
import { webOrderIntegrationController } from '../controllers/webOrderIntegration.controller';

const router = Router();

router.post('/lunarea-web-order', webOrderIntegrationController.importLunareaOrder);
router.post('/lunarea-web-return', webOrderIntegrationController.importLunareaReturn);
router.post('/lunarea-web-products/sync', webOrderIntegrationController.syncProductsToLunareaWebsite);

export default router;
