import express from 'express';
import {
    createCancellationRequest,
    getCancelRequestByOwner,
    getHandledCancelRequestByContractId,
    getNotHandledCancelRequestByContractId,
    updateCancellationRequestStatus,
} from '../controllers/contractCancellationRequest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.post('/', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), createCancellationRequest);

router.patch('/:requestId', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), updateCancellationRequestStatus);

router.get(
    '/handled/:contractId',
    authMiddleware,
    hasAnyRoleMiddleware(['renter', 'owner']),
    getHandledCancelRequestByContractId,
);

router.get('/not-handled/user', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), getCancelRequestByOwner);
router.get(
    '/not-handled/:contractId',
    authMiddleware,
    hasAnyRoleMiddleware(['renter', 'owner']),
    getNotHandledCancelRequestByContractId,
);

export default router;
