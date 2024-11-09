import express from 'express';
import upload from '../configs/multer.config';
import {
    acceptReportByOwner,
    acceptReportByRenter,
    cancelReportChild,
    completeReportByOwner,
    completeReportByRenter,
    createReportForRenter,
    proposedReportChildByOwner,
    rejectReportByRenter,
    resolveReportByAdmin,
} from '../controllers/report.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/child/:id/cancel', authMiddleware, roleMiddleware('renter'), cancelReportChild);
router.post('/renter/reject', authMiddleware, roleMiddleware('renter'), rejectReportByRenter);
router.post('/renter/accept', authMiddleware, roleMiddleware('renter'), acceptReportByRenter);
router.post('/renter/complete', authMiddleware, roleMiddleware('renter'), completeReportByRenter);
router.post('/renter', authMiddleware, roleMiddleware('renter'), upload.array('evidences', 5), createReportForRenter);
router.post('/owner/complete', authMiddleware, roleMiddleware('owner'), completeReportByOwner);
router.post('/owner/accept', authMiddleware, roleMiddleware('owner'), acceptReportByOwner);
router.post('/owner/propose', authMiddleware, roleMiddleware('owner'), proposedReportChildByOwner);
router.post('/admin/resolve', authMiddleware, roleMiddleware('admin'), resolveReportByAdmin);

export default router;
