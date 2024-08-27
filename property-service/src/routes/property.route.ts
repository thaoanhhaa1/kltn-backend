import express from 'express';
import upload from '../configs/multer.config';
import {
    createProperty,
    deleteProperty,
    getNotDeletedProperties,
    getNotDeletedPropertiesByOwnerId,
    getNotDeletedProperty,
    getNotPendingProperties,
    getPropertyBySlug,
    getPropertyStatus,
    searchProperties,
    updatePropertiesStatus,
    updateProperty,
    updateVisiblePropertiesStatus,
} from '../controllers/property.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.delete('/:property_id', authMiddleware, hasAnyRoleMiddleware(['owner', 'admin']), deleteProperty);

router.put('/:property_id', authMiddleware, roleMiddleware('owner'), upload.array('images'), updateProperty);

router.get('/search', searchProperties);
router.get('/slug/:slug', getPropertyBySlug);
router.get('/all', authMiddleware, roleMiddleware('admin'), getNotDeletedProperties);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getNotDeletedPropertiesByOwnerId);
router.get('/status', getPropertyStatus);
router.get('/:property_id', authMiddleware, roleMiddleware('admin'), getNotDeletedProperty);
router.get('/', getNotPendingProperties);

router.post('/approval', authMiddleware, roleMiddleware('admin'), updatePropertiesStatus);
router.post('/visible', authMiddleware, roleMiddleware('owner'), updateVisiblePropertiesStatus);
router.post('/', authMiddleware, roleMiddleware('owner'), upload.array('images'), createProperty);

export default router;
