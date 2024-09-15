import express from 'express';
import { createPropertyType, getPropertyTypes } from '../controllers/propertyType.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('admin'), createPropertyType);

router.get('/', getPropertyTypes);

export default router;
