import express from 'express';
import upload from '../configs/multer.config';
import {
    blockUser,
    forgotPassword,
    getAllOwnersCbb,
    getMyInfo,
    getUsers,
    otpToUser,
    updatePassword,
    updateUser,
    updateWalletAddress,
    verifyUser,
} from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.put('/', authMiddleware, upload.single('avatar'), updateUser);

router.patch('/wallet', authMiddleware, updateWalletAddress);

router.post('/otp', otpToUser);
router.post('/forgot-password', forgotPassword);
router.post('/update-password', authMiddleware, updatePassword);
router.post(
    '/verify',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    upload.fields([
        {
            name: 'front',
            maxCount: 1,
        },
        {
            name: 'back',
            maxCount: 1,
        },
    ]),
    verifyUser,
);
router.post('/block', authMiddleware, roleMiddleware('admin'), blockUser);

router.get('/me', authMiddleware, getMyInfo);
router.get('/owners/cbb', authMiddleware, roleMiddleware('admin'), getAllOwnersCbb);
router.get('/', authMiddleware, roleMiddleware('admin'), getUsers);

export default router;
