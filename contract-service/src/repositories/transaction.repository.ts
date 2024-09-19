import { ICreateTransaction } from '../interfaces/transaction';
import prisma from '../prisma/prismaClient';

export const createTransaction = (transaction: ICreateTransaction) => {
    return prisma.transaction.create({
        data: transaction,
    });
};
