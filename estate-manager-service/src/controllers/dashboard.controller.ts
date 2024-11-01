import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getOverviewByOwnerService } from '../services/dashboard.service';

export const getOverviewByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await getOverviewByOwnerService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
