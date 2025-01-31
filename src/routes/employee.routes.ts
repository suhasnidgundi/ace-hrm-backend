import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';

const router = Router();

router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployees);

export default router;