import express from 'express';
import {
    countNewUsersByTypeAndMonth,
    countPropertiesByCityAndDistrict,
    countPropertiesByType,
    getOverviewByAdmin,
    getOverviewByOwner,
} from '../controllers/dashboard.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/owner/overview', authMiddleware, roleMiddleware('owner'), getOverviewByOwner);
router.get('/admin/overview', authMiddleware, roleMiddleware('admin'), getOverviewByAdmin);
router.get(
    '/admin/count-new-users-by-type-and-month',
    authMiddleware,
    roleMiddleware('admin'),
    countNewUsersByTypeAndMonth,
);
router.get('/admin/count-properties-by-type', authMiddleware, roleMiddleware('admin'), countPropertiesByType);
router.get(
    '/admin/count-properties-by-city-and-district',
    authMiddleware,
    roleMiddleware('admin'),
    countPropertiesByCityAndDistrict,
);

export default router;
