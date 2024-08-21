import express from 'express';
import {
    forgotPassword,
    getMyInfo,
    getUsers,
    otpToUser,
    updatePassword,
    updateUser,
} from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';
import upload from '../configs/multer.config';

const router = express.Router();

router.put('/', authMiddleware, upload.single('avatar'), updateUser);

router.post('/otp', otpToUser);
router.post('/forgot-password', forgotPassword);
router.post('/update-password', authMiddleware, updatePassword);

router.get('/me', authMiddleware, getMyInfo);
router.get('/', authMiddleware, roleMiddleware('admin'), getUsers);

export default router;
