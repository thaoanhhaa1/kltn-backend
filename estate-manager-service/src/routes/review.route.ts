import express from 'express';
import upload from '../configs/multer.config';
import {
    createReview,
    deleteReviewById,
    getReviewsByContractId,
    getReviewsBySlug,
    updateReviewById,
} from '../controllers/review.controller';
import authMiddleware from '../middlewares/auth.middleware';
import hasAnyRoleMiddleware from '../middlewares/hasAnyRole.middleware';

const router = express.Router();

router.get('/contract/:contractId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), getReviewsByContractId);
router.get('/property/:propertyId', getReviewsBySlug);

router.post('/', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), upload.array('medias'), createReview);

router.put(
    '/:reviewId',
    authMiddleware,
    hasAnyRoleMiddleware(['owner', 'renter']),
    upload.array('new-medias'),
    updateReviewById,
);

router.delete('/:reviewId', authMiddleware, hasAnyRoleMiddleware(['owner', 'renter']), deleteReviewById);

export default router;
