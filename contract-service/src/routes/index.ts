import express from 'express';
import contractRoute from './contract.route';

const router = express.Router();

router.use('/contracts', contractRoute);

export default router;
