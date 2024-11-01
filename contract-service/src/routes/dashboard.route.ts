import express from 'express';
import {
    getContractCancellationRateByMonthForOwner,
    getIncomeExpenditureByMonth,
    getOverviewByOwner,
    getRentalRequestRating,
    getTenantDistributionByAreaForOwner,
} from '../controllers/dashboard.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/owner/overview', authMiddleware, roleMiddleware('owner'), getOverviewByOwner);
router.get('/owner/income-expenditure', authMiddleware, roleMiddleware('owner'), getIncomeExpenditureByMonth);
router.get(
    '/owner/contract-cancellation-rate',
    authMiddleware,
    roleMiddleware('owner'),
    getContractCancellationRateByMonthForOwner,
);
router.get('/owner/rental-request-rating', authMiddleware, roleMiddleware('owner'), getRentalRequestRating);
router.get('/owner/tenant-distribution', authMiddleware, roleMiddleware('owner'), getTenantDistributionByAreaForOwner);

export default router;
