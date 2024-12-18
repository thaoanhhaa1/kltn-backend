import express from 'express';
import { coingecko } from '../controllers/coingecko.controller';
import contractRoute from './contract.route';
import contractCancellationRequestRoute from './contractCancellationRequest.route';
import contractExtensionRequestRoute from './contractExtensionRequest.route';
import dashboardRoute from './dashboard.route';
import rentalRequestRoute from './rentalRequest.route';
import reportRoute from './report.route';
import transactionRoute from './transaction.route';

const router = express.Router();

router.get('/coingecko', coingecko);
router.use('/contracts', contractRoute);
router.use('/transactions', transactionRoute);
router.use('/rental-requests', rentalRequestRoute);
router.use('/contract-cancellation-requests', contractCancellationRequestRoute);
router.use('/contract-extension-requests', contractExtensionRequestRoute);
router.use('/dashboard', dashboardRoute);
router.use('/reports', reportRoute);

export default router;
