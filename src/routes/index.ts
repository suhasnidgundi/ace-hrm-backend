// import express from 'express';
// import { auth } from './middleware/auth';
// import { login } from '../controllers/auth.controller';
// import { timeOffController } from '../controllers/timeoff.controller';

// const router = express.Router();

// // Auth routes
// router.post('/login', login);

// // Protected routes
// router.use(auth);

// // Time off routes
// router.get('/time-offs', timeOffController.getTimeOffs);
// router.post('/time-offs', timeOffController.createTimeOff);
// router.patch('/time-offs/:id/review', timeOffController.reviewTimeOff);

// // User routes
// router.get('/me', (req, res) => res.json(req.user));
// router.get('/employees', async (req, res) => {
//     const { role, limit = 10, page = 1 } = req.query;
//     const query = role ? { role } : {};

//     try {
//         const users = await User.find(query)
//             .limit(Number(limit))
//             .skip((Number(page) - 1) * Number(limit));

//         res.json(users);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to fetch employees' });
//     }
// });

// export default router;

import { Request, Response } from 'express';
import express from 'express';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
});

// Health check route
router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

export default router;