import { IContractId } from '../interfaces/contract';
import { IPagination } from '../interfaces/pagination';
import { ICreateTransaction, IGetTransactionsByUserId, IPaymentTransaction } from '../interfaces/transaction';
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
            status: 'PENDING',
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

export const cancelTransactions = (contractIds: IContractId[]) => {
    return prisma.transaction.updateMany({
        where: {
            contract_id: {
                in: contractIds,
            },
            status: 'PENDING',
        },
        data: {
            status: 'CANCELLED',
        },
    });
};

export const getTransactionsByUser = ({ type, userId }: IGetTransactionsByUserId, { skip, take }: IPagination) => {
    const orQuery =
        type === 'ALL'
            ? {
                  OR: [
                      {
                          from_id: userId,
                      },
                      {
                          to_id: userId,
                      },
                  ],
              }
            : type === 'INCOME'
            ? {
                  to_id: userId,
              }
            : {
                  from_id: userId,
              };

    return prisma.transaction.findMany({
        where: {
            ...orQuery,
            status: {
                in: ['COMPLETED', 'FAILED'],
            },
        },
        orderBy: {
            updated_at: 'desc',
        },
        select: {
            id: true,
            amount: true,
            amount_eth: true,
            fee: true,
            transaction_hash: true,
            title: true,
            description: true,
            updated_at: true,
            from_id: true,
            to_id: true,
        },
        skip,
        take,
    });
};

export const countTransactionsByUser = ({ type, userId }: IGetTransactionsByUserId) => {
    const orQuery =
        type === 'ALL'
            ? {
                  OR: [
                      {
                          from_id: userId,
                      },
                      {
                          to_id: userId,
                      },
                  ],
              }
            : type === 'INCOME'
            ? {
                  to_id: userId,
              }
            : {
                  from_id: userId,
              };

    return prisma.transaction.count({
        where: {
            ...orQuery,
            status: {
                in: ['COMPLETED', 'FAILED'],
            },
        },
    });
};
