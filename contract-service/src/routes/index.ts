import express from 'express';
import contractRoute from './contract.route';
import transactionRoute from './transaction.route';
import { coingecko } from '../controllers/coingecko.controller';

const router = express.Router();

router.get('/coingecko', coingecko);
router.use('/contracts', contractRoute);
router.use('/transactions', transactionRoute);

export default router;
