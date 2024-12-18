import { TransactionStatus, TransactionType } from '@prisma/client';
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
        const status = req.query.status as TransactionStatus;
        const contractId = req.query.contractId as string;
        const propertyTitle = req.query.propertyId as string;
        const ownerName = req.query.ownerId as string;
        const amount = req.query.amount ? Number(req.query.amount) : undefined;
        const type = req.query.type as TransactionType;

        const transactions = await getTransactionsByRenterService({
            status,
            userId,
            contractId,
            propertyTitle,
            ownerName,
            amount,
            type,
        });

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
