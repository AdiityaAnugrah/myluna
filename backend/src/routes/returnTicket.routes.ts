import { Router } from 'express';
import { returnTicketController } from '../controllers/returnTicket.controller';
import { auth } from '../middlewares/auth';
import { rbac } from '../middlewares/rbac';

const router = Router();

router.use(auth);

router.get('/', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.getAll);
router.get('/summary', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.getSummary);
router.get('/:id', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.getById);
router.patch('/:id/read', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.markAsRead);
router.post('/:id/messages', rbac(['USER', 'TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.addMessage);
router.patch('/:id/deadline', rbac(['ADMIN', 'SUPER_ADMIN']), returnTicketController.updateDeadline);
router.patch('/:id/finalize-decision', rbac(['ADMIN', 'SUPER_ADMIN']), returnTicketController.finalizeDecision);
router.patch('/:id/start-execution', rbac(['TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.startExecution);
router.patch('/:id/complete-execution', rbac(['TCP', 'ADMIN', 'SUPER_ADMIN']), returnTicketController.completeExecution);

export default router;
