import express from 'express';
import contractRoute from './contract.route';
import transactionRoute from './transaction.route';

const router = express.Router();

router.use('/contracts', contractRoute);
router.use('/transactions', transactionRoute);

export default router;
