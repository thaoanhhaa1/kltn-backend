import { Router } from 'express';
import { getRejectReasonsByPropertyId } from '../controllers/rejectReason.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = Router();

router.get('/:propertyId', authMiddleware, hasAnyRoleMiddleware(['admin', 'owner']), getRejectReasonsByPropertyId);

export default router;
