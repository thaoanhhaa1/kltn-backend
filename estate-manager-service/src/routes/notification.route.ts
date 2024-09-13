import express from 'express';
import { countNewNotificationsByUserId, getNotificationsByUserId } from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/count', authMiddleware, countNewNotificationsByUserId);
router.get('/', authMiddleware, getNotificationsByUserId);

export default router;
