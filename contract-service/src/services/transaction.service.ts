import { IPagination, IPaginationResponse } from '../interfaces/pagination';
import { ICreateTransaction, IGetTransactionsByUserId, IHistoryTransaction } from '../interfaces/transaction';
import { IUserId } from '../interfaces/user';
import {
    countTransactionsByUser,
    createTransaction,
    getTransactionsByRenter,
    getTransactionsByUser,
} from '../repositories/transaction.repository';
import getPageInfo from '../utils/getPageInfo';

export const createTransactionService = (transaction: ICreateTransaction) => {
    return createTransaction(transaction);
};

export const getTransactionsByRenterService = (userId: IUserId) => {
    return getTransactionsByRenter(userId);
};

export const getTransactionsByUserIdService = async (params: IGetTransactionsByUserId, pagination: IPagination) => {
    const [transactions, count] = await Promise.all([
        getTransactionsByUser(params, pagination),
        countTransactionsByUser(params),
    ]);

    const paginationResult: IPaginationResponse<IHistoryTransaction> = {
        data: transactions,
        pageInfo: getPageInfo({ ...pagination, count }),
    };

    return paginationResult;
};
