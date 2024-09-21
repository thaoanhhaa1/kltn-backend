import express from 'express';
import { getTransactionsByRenter } from '../controllers/transaction.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/renter', authMiddleware, roleMiddleware('renter'), getTransactionsByRenter);

export default router;
