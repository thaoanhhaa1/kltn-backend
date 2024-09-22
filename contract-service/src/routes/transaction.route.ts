import express from 'express';
import { getTransactionsByRenter, getTransactionsByUser } from '../controllers/transaction.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/renter', authMiddleware, roleMiddleware('renter'), getTransactionsByRenter);
router.get('/', authMiddleware, hasAnyRoleMiddleware(['renter', 'owner']), getTransactionsByUser);

export default router;
