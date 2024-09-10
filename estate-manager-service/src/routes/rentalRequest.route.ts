import express from 'express';
import {
    createRentalRequest,
    getRentalRequestByOwner,
    getRentalRequestByRenter,
    getRentalRequestsByOwner,
    getRentalRequestsByRenter,
    ownerUpdateRentalRequestStatus,
    renterUpdateRentalRequestStatus,
} from '../controllers/rentalRequest.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('renter'), createRentalRequest);

router.get('/renter', authMiddleware, roleMiddleware('renter'), getRentalRequestsByRenter);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getRentalRequestsByOwner);
router.get('/renter/:slug', authMiddleware, roleMiddleware('renter'), getRentalRequestByRenter);
router.get('/owner/:slug', authMiddleware, roleMiddleware('owner'), getRentalRequestByOwner);

router.patch('/owner/status', authMiddleware, roleMiddleware('owner'), ownerUpdateRentalRequestStatus);
router.patch('/renter/status', authMiddleware, roleMiddleware('renter'), renterUpdateRentalRequestStatus);

export default router;
