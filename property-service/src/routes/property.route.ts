import express from 'express';
import upload from '../configs/multer.config';
import {
    createProperty,
    deleteProperty,
    getAllProperties,
    getPropertyBySlug,
    searchProperties,
    updatePropertiesStatus,
    updateProperty,
} from '../controllers/property.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.delete('/:property_id', authMiddleware, hasAnyRoleMiddleware(['owner', 'admin']), deleteProperty);

router.put(
    '/:property_id',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'admin']),
    upload.array('images'),
    updateProperty,
);

router.get('/search', searchProperties);
router.get('/slug/:slug', getPropertyBySlug);
router.get('/', getAllProperties);

router.post('/approval', authMiddleware, roleMiddleware('admin'), updatePropertiesStatus);
router.post('/', authMiddleware, roleMiddleware('owner'), upload.array('images'), createProperty);

export default router;
