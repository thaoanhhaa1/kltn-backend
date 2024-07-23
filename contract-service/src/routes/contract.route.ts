import express from 'express';
import {
    createContract,
    deleteContractById,
    getAllContracts,
    getContractById,
    getContractsByOwnerId,
    getContractsByRenterId,
    updateContractById,
} from '../controllers/contract.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('renter'), createContract);
router.get('/', authMiddleware, roleMiddleware('admin'), getAllContracts);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getContractsByOwnerId);
router.get('/renter', authMiddleware, roleMiddleware('renter'), getContractsByRenterId);
router.get('/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getContractById);
router.put('/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), updateContractById);
router.delete('/:contractId', authMiddleware, deleteContractById);

export default router;
