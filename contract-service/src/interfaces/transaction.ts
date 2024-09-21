import { TransactionStatus, TransactionType } from '@prisma/client';

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
