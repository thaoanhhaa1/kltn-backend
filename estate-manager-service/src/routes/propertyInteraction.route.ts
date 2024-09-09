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
router.get('/:interactionId', authMiddleware, roleMiddleware('renter'), getPropertyInteractionById);
router.post('/', authMiddleware, roleMiddleware('renter'), createPropertyInteraction);
router.put('/:interactionId', authMiddleware, roleMiddleware('renter'), updatePropertyInteraction);
router.delete('/:interactionId', authMiddleware, roleMiddleware('renter'), deletePropertyInteraction);

export default router;
