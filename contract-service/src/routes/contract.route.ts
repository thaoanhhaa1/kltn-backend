import express from 'express';
import {
    createContract,
    deposit,
    payMonthlyRent,
    cancelContractByOwner,
    cancelContractByRenter,
    getContractTransactions,
    getContractDetails,
    endContract,
    terminateForNonPayment,
    getContractsByOwner,
    getContractsByRenter,
    // deleteContractById,
    // getAllContracts,
    // getContractById,
    // getContractsByOwnerId,
    // getContractsByRenterId,
    // updateContractById,
} from '../controllers/contract.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('owner'), createContract);

// Route để thực hiện đặt cọc và tạo hợp đồng thành công
router.post('/deposit', authMiddleware, roleMiddleware('renter'), deposit);

// Route để thanh toán tiền thuê hàng tháng
router.post('/pay', authMiddleware, roleMiddleware('renter'), payMonthlyRent);

// Route để hủy hợp đồng bởi người thuê
router.post('/cancel/renter', authMiddleware, roleMiddleware('renter'), cancelContractByRenter);

// Route để hủy hợp đồng bởi chủ nhà
router.post('/cancel/owner', authMiddleware, roleMiddleware('owner'), cancelContractByOwner);

// Route để lấy danh sách giao dịch của hợp đồng
router.get(
    '/:contractId/transactions',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    getContractTransactions,
);

// Route để lấy chi tiết hợp đồng
router.get('/:contractId/details', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getContractDetails);

// Route để kết thúc hợp đồng
router.post('/end', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), endContract);

// Route để hủy hợp đồng do không thanh toán
router.post('/terminate', authMiddleware, roleMiddleware('owner'), terminateForNonPayment);
// router.get('/', authMiddleware, roleMiddleware('admin'), getAllContracts);
// router.get('/owner', authMiddleware, roleMiddleware('owner'), getContractsByOwnerId);
// router.get('/renter', authMiddleware, roleMiddleware('renter'), getContractsByRenterId);
// router.get('/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getContractById);
// router.put('/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), updateContractById);
// router.delete('/:contractId', authMiddleware, deleteContractById);

router.get('/owner', authMiddleware, roleMiddleware('owner'), getContractsByOwner);
router.get('/renter', authMiddleware, roleMiddleware('renter'), getContractsByRenter);

export default router;
