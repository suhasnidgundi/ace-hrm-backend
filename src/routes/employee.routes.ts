import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

// Get all employees (existing)
router.get('/', employeeController.getEmployees);

// Get employee by ID (existing)
router.get('/:id', employeeController.getEmployees);

// Create new employee (managers only)
router.post('/', requireRole(['Manager']), employeeController.createEmployee);

// Update employee
router.put('/:id', employeeController.updateEmployee);

// Update leave balance (managers only)
router.patch('/:id/leave-balance', requireRole(['Manager']), employeeController.updateLeaveBalance);

// Delete employee (managers only)
router.delete('/:id', requireRole(['Manager']), employeeController.deleteEmployee);

export default router;