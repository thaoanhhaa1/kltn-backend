import express from 'express';
import {
    createPropertyInteraction,
    deletePropertyInteraction,
    getAllPropertyInteraction,
    getPropertyInteractionById,
    updatePropertyInteraction,
} from '../controllers/propertyInteraction.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware('renter'), getAllPropertyInteraction);
router.get('/:interaction_id', authMiddleware, roleMiddleware('renter'), getPropertyInteractionById);
router.post('/', authMiddleware, roleMiddleware('renter'), createPropertyInteraction);
router.put('/:interaction_id', authMiddleware, roleMiddleware('renter'), updatePropertyInteraction);
router.delete('/:interaction_id', authMiddleware, roleMiddleware('renter'), deletePropertyInteraction);

export default router;
