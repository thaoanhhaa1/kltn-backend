import { TransactionStatus, TransactionType } from '@prisma/client';
import { IUserId } from './user';

export type ICreateTransaction = {
    amount: number;
    amountEth?: number;
    contractId: string;
    title: string;
    description?: string;
    fee?: number;
    status: TransactionStatus;
    transactionHash?: string;
    fromId?: string;
    toId?: string;
    endDate?: Date;
    type: TransactionType;
    feeEth?: number;
};

export interface IPaymentTransaction {
    id: number;
    amountEth: number;
    fee: number;
    feeEth: number;
    transactionHash: string;
}

export type ITransactionType = 'ALL' | 'INCOME' | 'OUTCOME';

export interface IGetTransactionsByUserId {
    userId: IUserId;
    type: ITransactionType;
}

export interface IHistoryTransaction {
    id: number;
    fromId: string | null;
    toId: string | null;
    amount: number;
    amountEth: number | null;
    fee: number | null;
    transactionHash: string | null;
    title: string;
    description: string | null;
    updatedAt: Date;
}

export interface ICalcAvgRevenueByMonth {
    month: number;
    year: number;
    userId: IUserId;
}

export interface IGetIncomeTransactionsByMonth {
    month: number;
    income: number;
}

export interface IGetExpenditureTransactionsByMonth {
    month: number;
    expenditure: number;
}

export interface IGetTransactionsByRenter {
    userId: IUserId;
    status: TransactionStatus;
    contractId?: string;
    propertyTitle?: string;
    ownerName?: IUserId;
    amount?: number;
    endDate?: Date | string;
    type?: TransactionType;
}
