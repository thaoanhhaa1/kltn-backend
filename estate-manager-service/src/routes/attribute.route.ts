import { Router } from 'express';
import {
    createAttribute,
    deleteAttribute,
    getAllAttributes,
    getAllAttributesCbb,
    getAttributeById,
    updateAttribute,
} from '../controllers/attribute.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = Router();

router.post('/', authMiddleware, roleMiddleware('admin'), createAttribute);
router.get('/', getAllAttributes);
router.get('/cbb', getAllAttributesCbb);
router.get('/:id', getAttributeById);
router.put('/:id', authMiddleware, roleMiddleware('admin'), updateAttribute);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deleteAttribute);

export default router;
