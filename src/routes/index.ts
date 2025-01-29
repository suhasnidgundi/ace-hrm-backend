import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { login, register } from '../controllers/auth.controller';
import { User } from '../models/User';
import { timeOffController } from '../controllers/timeoff.controller';

// Extend the Express Request type to include the user property
interface AuthRequest extends Request {
  user?: any; // You can replace 'any' with your User interface type
}

const router = express.Router();

// Auth routes
router.post('/login', login);
router.post('/register', register);

// Protected routes
router.use(auth);

// Time off routes
router.get('/time-offs', timeOffController.getTimeOffs);
router.post('/time-offs', timeOffController.createTimeOff);
router.patch('/time-offs/:id/review', timeOffController.reviewTimeOff);
router.get('/time-off-stats', timeOffController.getTimeOffStats);

// User routes
router.get('/me', (req: AuthRequest, res: Response) => {
  res.json(req.user);
});

router.get('/employees', async (req: Request, res: Response) => {
    const { role, limit = 10, page = 1 } = req.query;
    const query = role ? { role } : {};

    try {
        const users = await User.find(query)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

export default router;