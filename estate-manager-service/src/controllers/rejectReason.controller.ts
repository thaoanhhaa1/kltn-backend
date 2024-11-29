import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getRejectReasonsByPropertyIdService } from '../services/rejectReason.service';

export const getRejectReasonsByPropertyId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { propertyId } = req.params;
        const rejectReasons = await getRejectReasonsByPropertyIdService(propertyId);

        res.status(200).json(rejectReasons);
    } catch (error) {
        next(error);
    }
};
