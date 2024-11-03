import express from 'express';
import {
    createPropertyType,
    getPropertyTypeDetails,
    getPropertyTypes,
    softDeletePropertyType,
    updatePropertyType,
} from '../controllers/propertyType.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('admin'), createPropertyType);

router.get('/all', authMiddleware, roleMiddleware('admin'), getPropertyTypeDetails);
router.get('/', getPropertyTypes);

router.put('/:id', authMiddleware, roleMiddleware('admin'), updatePropertyType);

router.delete('/:id', authMiddleware, roleMiddleware('admin'), softDeletePropertyType);

export default router;
