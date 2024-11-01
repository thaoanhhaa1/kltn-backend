import express from 'express';
import { getOverviewByOwner } from '../controllers/dashboard.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/owner/overview', authMiddleware, roleMiddleware('owner'), getOverviewByOwner);

export default router;
