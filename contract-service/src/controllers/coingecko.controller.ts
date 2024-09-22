import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getCoinPriceService } from '../services/coingecko.service';

export const coingecko = async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getCoinPriceService({ coin: 'ethereum', currency: 'vnd' });

        res.status(200).json({ result });
    } catch (error) {
        next(error);
    }
};
