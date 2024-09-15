import express from 'express';
import {
    countNewNotificationsByUserId,
    getNotificationsByUserId,
    updateNotificationStatus,
} from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = express.Router();

router.post('/update-status', authMiddleware, updateNotificationStatus);

router.get('/count', authMiddleware, countNewNotificationsByUserId);
router.get('/', authMiddleware, getNotificationsByUserId);

export default router;
