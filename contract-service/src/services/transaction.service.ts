import { ICreateTransaction } from '../interfaces/transaction';
import { createTransaction } from '../repositories/transaction.repository';

export const createTransactionService = (transaction: ICreateTransaction) => {
    return createTransaction(transaction);
};
