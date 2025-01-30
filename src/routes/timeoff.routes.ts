import { Router } from 'express';
import { timeOffController } from '../controllers/timeoff.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', timeOffController.getTimeOffs);
router.post('/', timeOffController.createTimeOff);
router.patch('/:id/review', requireRole(['Manager']), timeOffController.reviewTimeOff);
router.get('/stats', timeOffController.getTimeOffStats);

export default router;