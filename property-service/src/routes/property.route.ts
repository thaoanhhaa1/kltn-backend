import express from 'express';
import upload from '../configs/multer.config';
import { createProperty, getAllProperties, getPropertyBySlug } from '../controllers/property.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/slug/:slug', getPropertyBySlug);
router.post('/', authMiddleware, roleMiddleware('owner'), upload.array('images'), createProperty);
router.get('/', getAllProperties);

export default router;
