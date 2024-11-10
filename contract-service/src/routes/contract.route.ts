import express from 'express';
import {
    cancelContractBeforeDeposit,
    createContractAndApprovalRequest,
    deposit,
    getContractDetail,
    getContractsByOwner,
    getContractsByRenter,
    payMonthlyRent,
} from '../controllers/contract.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/deposit', authMiddleware, roleMiddleware('renter'), deposit);
router.post(
    '/cancel-before-deposit',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    cancelContractBeforeDeposit,
);
router.post('/pay', authMiddleware, roleMiddleware('renter'), payMonthlyRent);
router.post('/', authMiddleware, roleMiddleware('owner'), createContractAndApprovalRequest);

router.get('/owner', authMiddleware, roleMiddleware('owner'), getContractsByOwner);
router.get('/renter', authMiddleware, roleMiddleware('renter'), getContractsByRenter);
router.get('/:contractId', authMiddleware, getContractDetail);

export default router;
