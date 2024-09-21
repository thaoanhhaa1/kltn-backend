import { ICreateTransaction } from '../interfaces/transaction';
import { IUserId } from '../interfaces/user';
import { createTransaction, getTransactionsByRenter } from '../repositories/transaction.repository';

export const createTransactionService = (transaction: ICreateTransaction) => {
    return createTransaction(transaction);
};

export const getTransactionsByRenterService = (userId: IUserId) => {
    return getTransactionsByRenter(userId);
};
