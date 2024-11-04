import express from 'express';
import upload from '../configs/multer.config';
import {
    countNotPendingProperties,
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
import parseTokenMiddleware from '../middlewares/parseToken.middleware';

const router = express.Router();

router.delete('/:propertyId', authMiddleware, hasAnyRoleMiddleware(['owner', 'admin']), deleteProperty);

router.put('/:propertyId', authMiddleware, roleMiddleware('owner'), upload.array('images'), updateProperty);

router.get('/search', parseTokenMiddleware, searchProperties);
router.get('/slug/:slug', parseTokenMiddleware, getPropertyBySlug);
router.get('/all', authMiddleware, roleMiddleware('admin'), getNotDeletedProperties);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getNotDeletedPropertiesByOwnerId);
router.get('/status', getPropertyStatus);
router.get('/count', countNotPendingProperties);
router.get('/:propertyId', authMiddleware, hasAnyRoleMiddleware(['admin', 'owner']), getNotDeletedProperty);
router.get('/', getNotPendingProperties);

router.post('/approval', authMiddleware, roleMiddleware('admin'), updatePropertiesStatus);
router.post('/visible', authMiddleware, roleMiddleware('owner'), updateVisiblePropertiesStatus);
router.post('/', authMiddleware, roleMiddleware('owner'), upload.array('images'), createProperty);

export default router;
