import express from 'express';
import {
    countRentalRequestByDay,
    countRentalRequestByMonth,
    countRentalRequestByWeek,
    getContractCancellationRateByMonthForOwner,
    getIncomeExpenditureByMonth,
    getOverviewByAdmin,
    getOverviewByOwner,
    getRentalRequestRating,
    getTenantDistributionByAreaForOwner,
} from '../controllers/dashboard.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/owner/overview', authMiddleware, roleMiddleware('owner'), getOverviewByOwner);
router.get('/admin/overview', authMiddleware, roleMiddleware('admin'), getOverviewByAdmin);
router.get('/owner/income-expenditure', authMiddleware, roleMiddleware('owner'), getIncomeExpenditureByMonth);
router.get(
    '/owner/contract-cancellation-rate',
    authMiddleware,
    roleMiddleware('owner'),
    getContractCancellationRateByMonthForOwner,
);
router.get('/owner/rental-request-rating', authMiddleware, roleMiddleware('owner'), getRentalRequestRating);
router.get('/owner/tenant-distribution', authMiddleware, roleMiddleware('owner'), getTenantDistributionByAreaForOwner);
router.get('/admin/rental-request-by-day', authMiddleware, roleMiddleware('admin'), countRentalRequestByDay);
router.get('/admin/rental-request-by-week', authMiddleware, roleMiddleware('admin'), countRentalRequestByWeek);
router.get('/admin/rental-request-by-month', authMiddleware, roleMiddleware('admin'), countRentalRequestByMonth);

export default router;
