import { ICreateTransaction, IPaymentTransaction } from '../interfaces/transaction';
import { IUserId } from '../interfaces/user';
import prisma from '../prisma/prismaClient';

export const createTransaction = (transaction: ICreateTransaction) => {
    return prisma.transaction.create({
        data: transaction,
    });
};

export const getTransactionById = (id: number) => {
    return prisma.transaction.findUnique({
        where: {
            id,
        },
    });
};

export const paymentTransaction = ({ id, ...rest }: IPaymentTransaction) => {
    return prisma.transaction.update({
        where: {
            id,
        },
        data: {
            status: 'COMPLETED',
            ...rest,
        },
    });
};

export const getTransactionsByRenter = (userId: IUserId) => {
    return prisma.transaction.findMany({
        where: {
            from_id: userId,
        },
        orderBy: {
            created_at: 'desc',
        },
    });
};
