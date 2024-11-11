import express from 'express';
import upload from '../configs/multer.config';
import {
    acceptReportByOwner,
    acceptReportByRenter,
    cancelReportChild,
    completeReportByOwner,
    completeReportByRenter,
    createReportForRenter,
    findReportsAndLastChild,
    getReportByAdmin,
    getReportByOwner,
    getReportByRenter,
    getReportDetailById,
    inProgressReport,
    ownerNoResolveReport,
    proposedReportChildByOwner,
    rejectReportByRenter,
    resolveReportByAdmin,
} from '../controllers/report.controller';
import authMiddleware from '../middlewares/auth.middleware';
import roleMiddleware from '../middlewares/role.middleware';

const router = express.Router();

router.post('/renter/reject', authMiddleware, roleMiddleware('renter'), rejectReportByRenter);
router.post('/renter/accept', authMiddleware, roleMiddleware('renter'), acceptReportByRenter);
router.post('/renter/complete', authMiddleware, roleMiddleware('renter'), completeReportByRenter);
router.post('/renter/owner-not-resolve', authMiddleware, roleMiddleware('renter'), ownerNoResolveReport);
router.post('/renter', authMiddleware, roleMiddleware('renter'), upload.array('evidences', 5), createReportForRenter);
router.post('/owner/complete', authMiddleware, roleMiddleware('owner'), completeReportByOwner);
router.post('/owner/accept', authMiddleware, roleMiddleware('owner'), acceptReportByOwner);
router.post(
    '/owner/propose',
    authMiddleware,
    roleMiddleware('owner'),
    upload.array('evidences', 5),
    proposedReportChildByOwner,
);
router.post('/owner/in-progress', authMiddleware, roleMiddleware('owner'), inProgressReport);
router.post(
    '/admin/resolve',
    authMiddleware,
    roleMiddleware('admin'),
    upload.array('evidences', 5),
    resolveReportByAdmin,
);
router.post('/:id/cancel', authMiddleware, roleMiddleware('renter'), cancelReportChild);

router.get('/contracts/:contractId', authMiddleware, findReportsAndLastChild);
router.get('/renter', authMiddleware, roleMiddleware('renter'), getReportByRenter);
router.get('/owner', authMiddleware, roleMiddleware('owner'), getReportByOwner);
router.get('/admin', authMiddleware, roleMiddleware('admin'), getReportByAdmin);
router.get('/:id', authMiddleware, getReportDetailById);

export default router;
