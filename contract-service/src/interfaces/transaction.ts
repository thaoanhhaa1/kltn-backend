import { TransactionStatus, TransactionType } from '@prisma/client';
import { IUserId } from './user';

export type ICreateTransaction = {
    amount: number;
    amount_eth?: number;
    contract_id: string;
    title: string;
    description?: string;
    fee?: number;
    status: TransactionStatus;
    transaction_hash?: string;
    from_id?: string;
    to_id?: string;
    end_date?: Date;
    type: TransactionType;
};

export interface IPaymentTransaction {
    id: number;
    amount_eth: number;
    fee: number;
    transaction_hash: string;
}

export type ITransactionType = 'ALL' | 'INCOME' | 'OUTCOME';

export interface IGetTransactionsByUserId {
    userId: IUserId;
    type: ITransactionType;
}

export interface IHistoryTransaction {
    id: number;
    from_id: string | null;
    to_id: string | null;
    amount: number;
    amount_eth: number | null;
    fee: number | null;
    transaction_hash: string | null;
    title: string;
    description: string | null;
    updated_at: Date;
}
