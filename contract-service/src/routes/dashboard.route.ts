import express from 'express';
import { getIncomeExpenditureByMonth, getOverviewByOwner } from '../controllers/dashboard.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/owner/overview', authMiddleware, roleMiddleware('owner'), getOverviewByOwner);
router.get('/owner/income-expenditure', authMiddleware, roleMiddleware('owner'), getIncomeExpenditureByMonth);

export default router;
