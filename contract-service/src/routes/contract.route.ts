import express from 'express';
import {
    cancelContractBeforeDeposit,
    createContractAndApprovalRequest,
    deposit,
    getContractDetail,
    getContractsByOwner,
    getContractsByRenter,
    // cancelContractByOwner,
    // cancelContractByRenter,
    getContractTransactions,
    payMonthlyRent,
    terminateForNonPayment,
} from '../controllers/contract.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('owner'), createContractAndApprovalRequest);
// router.post('/', authMiddleware, roleMiddleware('owner'), createContract);

// Route để thực hiện đặt cọc và tạo hợp đồng thành công
router.post('/deposit', authMiddleware, roleMiddleware('renter'), deposit);
router.post(
    '/cancel-before-deposit',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    cancelContractBeforeDeposit,
);

// Route để thanh toán tiền thuê hàng tháng
router.post('/pay', authMiddleware, roleMiddleware('renter'), payMonthlyRent);

// // Route để hủy hợp đồng bởi người thuê
// router.post('/cancel/renter', authMiddleware, roleMiddleware('renter'), cancelContractByRenter);

// // Route để hủy hợp đồng bởi chủ nhà
// router.post('/cancel/owner', authMiddleware, roleMiddleware('owner'), cancelContractByOwner);

// Route để lấy danh sách giao dịch của hợp đồng
router.get(
    '/:contractId/transactions',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    getContractTransactions,
);

// Route để lấy chi tiết hợp đồng

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
router.get('/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getContractDetail);

export default router;
