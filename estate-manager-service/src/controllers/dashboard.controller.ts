import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    countNewUsersByTypeAndMonthService,
    countPropertiesByCityAndDistrictService,
    countPropertiesByTypeService,
    getOverviewByAdminService,
    getOverviewByOwnerService,
} from '../services/dashboard.service';

export const getOverviewByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await getOverviewByOwnerService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getOverviewByAdmin = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getOverviewByAdminService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countNewUsersByTypeAndMonth = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countNewUsersByTypeAndMonthService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countPropertiesByType = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countPropertiesByTypeService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countPropertiesByCityAndDistrict = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await countPropertiesByCityAndDistrictService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
