import express from 'express';
import {
    createCancellationRequest,
    updateCancellationRequestStatus,
} from '../controllers/contractCancellationRequest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.post('/', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), createCancellationRequest);

router.patch('/:requestId', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), updateCancellationRequestStatus);

export default router;
