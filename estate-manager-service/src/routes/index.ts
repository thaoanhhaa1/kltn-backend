import express from 'express';
import userRoute from './user.route';
import authRoute from './auth.route';

const router = express.Router();

router.use('/users', userRoute);
router.use('/auth', authRoute);

export default router;
