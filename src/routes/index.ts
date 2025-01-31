import { Router } from 'express';
import { auth } from '../middleware/auth';
import { employeeController } from '../controllers/employee.controller';

import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import teamRoutes from './team.routes';
import timeOffRoutes from './timeoff.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use(auth);

// Add /me route at root level
router.get('/me', employeeController.getMe);

// Protected route groups
router.use('/employees', employeeRoutes);
router.use('/teams', teamRoutes);
router.use('/time-offs', timeOffRoutes);

export default router;
export const apiRouter = router;