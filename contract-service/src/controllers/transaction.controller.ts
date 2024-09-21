import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { getTransactionsByRenterService } from '../services/transaction.service';

export const getTransactionsByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const transactions = await getTransactionsByRenterService(userId);

        res.status(200).json(transactions);
    } catch (error) {
        next(error);
    }
};
