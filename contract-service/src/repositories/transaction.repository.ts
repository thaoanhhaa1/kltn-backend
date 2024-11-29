import { IContractId } from '../interfaces/contract';
import {
    ICountTransactionsByMonthAndStatus,
    ICountTransactionsByStatus,
    ITransactionStats,
} from '../interfaces/dashboard';
import { IPagination } from '../interfaces/pagination';
import {
    ICalcAvgRevenueByMonth,
    ICreateTransaction,
    IGetExpenditureTransactionsByMonth,
    IGetIncomeTransactionsByMonth,
    IGetTransactionsByUserId,
    IPaymentTransaction,
} from '../interfaces/transaction';
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
            fromId: userId,
            type: {
                in: ['RENT', 'DEPOSIT'],
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const cancelTransactions = (contractIds: IContractId[]) => {
    return prisma.transaction.updateMany({
        where: {
            contractId: {
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
                          fromId: userId,
                      },
                      {
                          toId: userId,
                      },
                  ],
              }
            : type === 'INCOME'
            ? {
                  toId: userId,
              }
            : {
                  fromId: userId,
              };

    return prisma.transaction.findMany({
        where: {
            ...orQuery,
            status: {
                in: ['COMPLETED', 'FAILED'],
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
        include: {
            from: {
                select: {
                    userId: true,
                    name: true,
                },
            },
            to: {
                select: {
                    userId: true,
                    name: true,
                },
            },
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
                          fromId: userId,
                      },
                      {
                          toId: userId,
                      },
                  ],
              }
            : type === 'INCOME'
            ? {
                  toId: userId,
              }
            : {
                  fromId: userId,
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

export const findByContractAndRented = (contractId: IContractId) => {
    return prisma.transaction.findFirst({
        where: {
            contractId: contractId,
            status: 'COMPLETED',
            type: 'RENT',
        },
    });
};

export const getOverdueTransactions = () => {
    return prisma.transaction.findMany({
        where: {
            status: 'PENDING',
            type: {
                in: ['RENT', 'DEPOSIT'],
            },
            endDate: {
                lte: new Date(),
            },
        },
    });
};

export const updateEndDate = (id: number, endDate: Date) => {
    return prisma.transaction.update({
        where: {
            id,
        },
        data: {
            endDate,
        },
    });
};

export const getCompensationTransaction = (contractId: IContractId) => {
    return prisma.transaction.findFirst({
        where: {
            contractId,
            type: 'COMPENSATION',
            status: 'COMPLETED',
            toId: null,
        },
    });
};

export const calcAvgRevenueByMonth = ({ month, userId, year }: ICalcAvgRevenueByMonth) => {
    return prisma.transaction.aggregate({
        where: {
            fromId: {
                not: null,
            },
            toId: userId,
            type: 'RENT',
            status: 'COMPLETED',
            updatedAt: {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1),
            },
        },
        _avg: {
            amount: true,
            amountEth: true,
        },
    });
};

export const getRevenueByMonth = ({ month, userId, year }: ICalcAvgRevenueByMonth) => {
    return prisma.transaction.findMany({
        where: {
            fromId: {
                not: null,
            },
            toId: userId,
            type: 'RENT',
            status: 'COMPLETED',
            updatedAt: {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1),
            },
        },
    });
};

export const getIncomeTransactionsByMonth = async (userId: IUserId, year: number) => {
    const result = await prisma.$queryRaw`
        SELECT 
            EXTRACT(MONTH FROM "updated_at") AS month, 
            SUM(amount) AS income 
        FROM 
            "\`transaction\`" 
        WHERE
            to_id = ${userId} AND 
            status = 'COMPLETED' AND 
            EXTRACT(YEAR FROM "updated_at") = ${year}
        GROUP BY 
            month 
        ORDER BY 
            month;
    `;

    return result as Array<IGetIncomeTransactionsByMonth>;
};

export const getExpenditureTransactionsByMonth = async (userId: IUserId, year: number) => {
    const result = await prisma.$queryRaw`
        SELECT 
            EXTRACT(MONTH FROM "updated_at") AS month, 
            SUM(amount + COALESCE(fee, 0)) AS expenditure 
        FROM 
            "\`transaction\`" 
        WHERE
            from_id = ${userId} AND 
            status = 'COMPLETED' AND 
            EXTRACT(YEAR FROM "updated_at") = ${year}
        GROUP BY 
            month 
        ORDER BY 
            month;
    `;

    return result as Array<IGetExpenditureTransactionsByMonth>;
};

export const getTransactionsUnPaid = () => {
    return prisma.transaction.findMany({
        where: {
            status: 'PENDING',
            endDate: {
                gt: new Date(),
            },
        },
    });
};

export const cancelTransactionsWhenEndContract = (contractId: IContractId) => {
    return prisma.transaction.updateMany({
        where: {
            contractId,
            status: 'PENDING',
        },
        data: {
            status: 'CANCELLED',
        },
    });
};

export const getTransactionStats = async (): Promise<Array<ITransactionStats>> => {
    return prisma.$queryRaw`
        SELECT 
            COUNT(id) AS total_transactions, 
            SUM(CASE 
                WHEN type = 'RENT' THEN amount
                ELSE 0
            END) AS total_revenue,
            SUM(CASE 
                WHEN type in ('DEPOSIT', 'COMPENSATION', 'RENT', 'REFUND') THEN fee
                WHEN type in ('CREATE_CONTRACT', 'CANCEL_CONTRACT', 'END_CONTRACT') THEN amount
                ELSE 0
            END) AS total_fee
        FROM
            "\`transaction\`"
        WHERE
            status = 'COMPLETED';
    `;
};

export const countTransactionsByMonth = async (year: number) => {
    return prisma.$queryRaw`
        SELECT 
            EXTRACT(MONTH FROM "updated_at") AS month, 
            COUNT(id) AS total_transactions 
        FROM 
            "\`transaction\`" 
        WHERE
            status = 'COMPLETED'
            and type in ('RENT', 'DEPOSIT', 'REFUND', 'COMPENSATION')
            and EXTRACT(YEAR FROM "updated_at") = ${year}
        GROUP BY 
            month 
        ORDER BY 
            month;
    `;
};

// đếm số lượng giao dịch theo từng tháng và từng trạng thái
export const countTransactionsByMonthAndStatus = async (
    year: number,
): Promise<Array<ICountTransactionsByMonthAndStatus>> => {
    return prisma.$queryRaw`
        SELECT 
            EXTRACT(MONTH FROM "updated_at") AS month, 
            status, 
            COUNT(id) AS total_transactions 
        FROM 
            "\`transaction\`" 
        WHERE
            type in ('RENT', 'DEPOSIT', 'REFUND', 'COMPENSATION')
            and EXTRACT(YEAR FROM "updated_at") = ${year}
        GROUP BY 
            month, status 
        ORDER BY 
            month;
    `;
};

export const getRevenueAndFeeByMonth = async (year: number) => {
    return prisma.$queryRaw`
        SELECT 
            EXTRACT(MONTH FROM "updated_at") AS month, 
            SUM(CASE 
                WHEN type = 'RENT' THEN amount
                ELSE 0
            END) AS revenue, 
            SUM(CASE 
                WHEN type in ('DEPOSIT', 'COMPENSATION', 'RENT', 'REFUND') THEN fee
                WHEN type in ('CREATE_CONTRACT', 'CANCEL_CONTRACT', 'END_CONTRACT') THEN amount
                ELSE 0
            END) AS fee 
        FROM 
            "\`transaction\`" 
        WHERE
            status = 'COMPLETED'
            and EXTRACT(YEAR FROM "updated_at") = ${year}
        GROUP BY 
            month 
        ORDER BY 
            month;
    `;
};

// đếm số lượng giao dịch theo trạng thái
export const countTransactionsByStatus = async (): Promise<Array<ICountTransactionsByStatus>> => {
    return prisma.$queryRaw`
        SELECT 
            status, 
            COUNT(id) AS total_transactions 
        FROM 
            "\`transaction\`"
        WHERE
            type in ('RENT', 'DEPOSIT', 'REFUND', 'COMPENSATION')
        GROUP BY 
            status;
    `;
};

export const findDepositedTransaction = (contractId: IContractId) => {
    return prisma.transaction.findFirst({
        where: {
            contractId,
            type: 'DEPOSIT',
            status: 'COMPLETED',
        },
    });
};

export const getTransactionsByContractId = (contractId: IContractId, userId: IUserId) => {
    return prisma.transaction.findMany({
        where: {
            contractId,
            status: 'COMPLETED',
            OR: [
                {
                    fromId: userId,
                },
                {
                    toId: userId,
                },
            ],
        },
    });
};

export const getTransactionByContractIdAndTitle = (contractId: IContractId, title: string) => {
    return prisma.transaction.findFirst({
        where: {
            contractId,
            title,
        },
    });
};
