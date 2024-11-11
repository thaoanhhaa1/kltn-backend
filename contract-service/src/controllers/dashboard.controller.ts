import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    countRentalRequestByDayService,
    countRentalRequestByMonthService,
    countRentalRequestByWeekService,
    countTransactionsByMonthAndStatusService,
    countTransactionsByStatusService,
    getContractCancellationRateByMonthForOwnerService,
    getIncomeExpenditureByMonthService,
    getOverviewByAdminService,
    getOverviewByOwnerService,
    getRentalRequestRatingService,
    getRevenueAndFeeByMonthService,
    getTenantDistributionByAreaForOwnerService,
} from '../services/dashboard.service';

export const getOverviewByOwner = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        console.log('🚀 ~ getOverviewByOwner ~ userId:', userId);

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

export const getIncomeExpenditureByMonth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await getIncomeExpenditureByMonthService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getTenantDistributionByAreaForOwner = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;

        const result = await getTenantDistributionByAreaForOwnerService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getContractCancellationRateByMonthForOwner = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const userId = req.user!.id;

        const result = await getContractCancellationRateByMonthForOwnerService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getRentalRequestRating = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const result = await getRentalRequestRatingService(userId);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countRentalRequestByDay = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countRentalRequestByDayService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countRentalRequestByWeek = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countRentalRequestByWeekService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countRentalRequestByMonth = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countRentalRequestByMonthService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countTransactionsByStatus = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await countTransactionsByStatusService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const getRevenueAndFeeByMonth = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getRevenueAndFeeByMonthService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const countTransactionsByMonthAndStatus = async (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
) => {
    try {
        const result = await countTransactionsByMonthAndStatusService();

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};
