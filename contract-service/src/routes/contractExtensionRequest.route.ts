import express from 'express';
import {
    createContractExtensionRequest,
    getContractExtensionRequestByContractId,
    updateContractExtensionRequestStatus,
} from '../controllers/contractExtensionRequest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('renter'), createContractExtensionRequest);

router.patch('/', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), updateContractExtensionRequestStatus);

router.get(
    '/contracts/:contractId',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    getContractExtensionRequestByContractId,
);

export default router;
