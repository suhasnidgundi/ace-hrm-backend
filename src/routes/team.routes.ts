import { Router } from 'express';
import { teamController } from '../controllers/team.controller';
import { requireRole } from '../middleware/auth';

const router = Router();

router.post('/', requireRole(['Manager']), teamController.createTeam);
router.get('/:teamId/hierarchy', teamController.getTeamHierarchy);
router.get('/organization-hierarchy', teamController.getOrganizationHierarchy);
router.patch('/:teamId', requireRole(['Manager']), teamController.updateTeam);
router.post('/:teamId/members', requireRole(['Manager']), teamController.addTeamMember);
router.delete('/:teamId/members/:employeeId', requireRole(['Manager']), teamController.removeTeamMember);

export default router;