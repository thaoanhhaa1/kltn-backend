import { TransactionStatus } from '@prisma/client';

export type ICreateTransaction = {
    amount: number;
    amount_eth?: number;
    contract_id: string;
    title: string;
    description?: string;
    fee?: number;
    status: TransactionStatus;
    transaction_hash?: string;
};
