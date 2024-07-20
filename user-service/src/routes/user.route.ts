import express from 'express';
import { getMyInfo } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/', (_req, res) => {
    res.send('User all');
});

router.get('/me', authMiddleware, getMyInfo);

export default router;
