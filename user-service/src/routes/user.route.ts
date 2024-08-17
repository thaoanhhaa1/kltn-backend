import express from 'express';
import { getMyInfo, getUsers } from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/me', authMiddleware, getMyInfo);
router.get('/', authMiddleware, roleMiddleware('admin'), getUsers);

export default router;
