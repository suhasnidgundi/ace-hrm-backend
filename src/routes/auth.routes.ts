import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { auth } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/logout', auth, authController.logout);

export default router;