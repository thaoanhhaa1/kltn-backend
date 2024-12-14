import express from 'express';
import {
    cancelContractBeforeDeposit,
    createContractAndApprovalRequest,
    deposit,
    generateContract,
    getAvailableContractsBySlug,
    getContractDetail,
    getContractsByOwner,
    getContractsByRenter,
    getPropertiesByOwner,
    getPropertiesByRenter,
    getUsersByOwner,
    getUsersByRenter,
    payMonthlyRent,
} from '../controllers/contract.controller';
import { getTransactionsByContractId } from '../controllers/transaction.controller';
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
router.post('/generate', authMiddleware, roleMiddleware('owner'), generateContract);
router.post('/', authMiddleware, roleMiddleware('owner'), createContractAndApprovalRequest);

router.get('/property/:slug', getAvailableContractsBySlug);
router.get('/owner/property/cbb', authMiddleware, roleMiddleware('owner'), getPropertiesByOwner);
router.get('/owner/user/cbb', authMiddleware, roleMiddleware('owner'), getUsersByOwner);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getContractsByOwner);
router.get('/renter/property/cbb', authMiddleware, roleMiddleware('renter'), getPropertiesByRenter);
router.get('/renter/user/cbb', authMiddleware, roleMiddleware('renter'), getUsersByRenter);
router.get('/renter', authMiddleware, roleMiddleware('renter'), getContractsByRenter);
router.get(
    '/:contractId/transactions',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    getTransactionsByContractId,
);
router.get('/:contractId', authMiddleware, getContractDetail);

export default router;
