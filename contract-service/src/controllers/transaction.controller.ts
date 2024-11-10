import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import {
    getTransactionsByContractIdService,
    getTransactionsByRenterService,
    getTransactionsByUserIdService,
} from '../services/transaction.service';
import CustomError from '../utils/error.util';

export const getTransactionsByRenter = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;

        const transactions = await getTransactionsByRenterService(userId);

        res.status(200).json(transactions);
    } catch (error) {
        next(error);
    }
};

export const getTransactionsByUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const type = req.query.type;
        const skip = Number(req.query.skip || 0);
        const take = Number(req.query.take || 10);

        if (type !== 'ALL' && type !== 'INCOME' && type !== 'OUTCOME')
            throw new CustomError(400, 'Loại giao dịch không hợp lệ');

        const transactions = await getTransactionsByUserIdService(
            { userId, type },
            {
                skip,
                take,
            },
        );

        res.status(200).json(transactions);
    } catch (error) {
        next(error);
    }
};

export const getTransactionsByContractId = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id;
        const contractId = req.params.contractId;

        const transactions = await getTransactionsByContractIdService(contractId, userId);

        res.status(200).json(transactions);
    } catch (error) {
        next(error);
    }
};
