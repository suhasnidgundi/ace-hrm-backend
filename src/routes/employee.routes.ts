import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

router.get('/', employeeController.getEmployees);
router.get('/:id', employeeController.getEmployee);
router.patch('/:id', employeeController.updateEmployee);
router.get('/team-hierarchy', requireRole(['Manager']), employeeController.getTeamHierarchy);
router.patch(
    '/:id/leave-balance',
    requireRole(['Manager']),
    employeeController.updateLeaveBalance
);

export default router;