import express from 'express';
import { coingecko } from '../controllers/coingecko.controller';
import contractRoute from './contract.route';
import contractCancellationRequestRoute from './contractCancellationRequest.route';
import transactionRoute from './transaction.route';

const router = express.Router();

router.get('/coingecko', coingecko);
router.use('/contracts', contractRoute);
router.use('/transactions', transactionRoute);
router.use('/contract-cancellation-requests', contractCancellationRequestRoute);

export default router;
