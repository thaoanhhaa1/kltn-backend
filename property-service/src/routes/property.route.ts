import express from 'express';
import upload from '../configs/multer.config';
import { createProperty, getAllProperties } from '../controllers/property.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('owner'), upload.array('images'), createProperty);
router.get('/', getAllProperties);

export default router;
