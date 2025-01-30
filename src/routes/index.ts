import { Router, Response } from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/request.types';

import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import teamRoutes from './team.routes';
import timeOffRoutes from './timeoff.routes';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes
router.use(auth);

// Protected route groups
router.use('/employees', employeeRoutes);
router.use('/teams', teamRoutes);
router.use('/time-offs', timeOffRoutes);

// Profile route
router.get('/me', (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
});

export default router;
export const apiRouter = router;