import { IUserId } from '../interfaces/user';
import { countCancelRequestByUserId } from '../repositories/contractCancellationRequest.repository';
import { countExtensionRequestByUserId } from '../repositories/contractExtensionRequest.repository';
import { countRentalRequestByUserId } from '../repositories/rentalRequest.repository';
import {
    calcAvgRevenueByMonth,
    getExpenditureTransactionsByMonth,
    getIncomeTransactionsByMonth,
} from '../repositories/transaction.repository';
import { findUserById } from '../repositories/user.repository';
import CustomError from '../utils/error.util';

export const getOverviewByOwnerService = async (ownerId: IUserId) => {
    const now = new Date();

    const [user, countRentalRequest, countExtensionRequest, countCancelRequest, avgRevenue] = await Promise.all([
        findUserById(ownerId),
        countRentalRequestByUserId(ownerId),
        countExtensionRequestByUserId(ownerId),
        countCancelRequestByUserId(ownerId),
        calcAvgRevenueByMonth({ month: now.getMonth() + 1, year: now.getFullYear(), userId: ownerId }),
    ]);

    if (!user) throw new CustomError(404, 'Không tìm thấy người dùng');

    return {
        countRentalRequest,
        countExtensionRequest,
        countCancelRequest,
        avgRevenue: {
            VND: avgRevenue._avg.amount ?? 0,
            ETH: avgRevenue._avg.amountEth ?? 0,
        },
    };
};

export const getIncomeExpenditureByMonthService = async (userId: IUserId) => {
    const year = new Date().getFullYear();

    const [income, expenditure] = await Promise.all([
        getIncomeTransactionsByMonth(userId, year),
        getExpenditureTransactionsByMonth(userId, year),
    ]);
    console.log('🚀 ~ getIncomeExpenditureByMonthService ~ income:', income);
    console.log('🚀 ~ getIncomeExpenditureByMonthService ~ expenditure:', expenditure);

    const minMonth = Math.min(income[0]?.month ?? Infinity, expenditure[0]?.month ?? Infinity);
    console.log('🚀 ~ getIncomeExpenditureByMonthService ~ minMonth:', minMonth);
    const maxMonth = Math.max(
        income[income.length - 1]?.month ?? -Infinity,
        expenditure[expenditure.length - 1]?.month ?? -Infinity,
    );
    console.log('🚀 ~ getIncomeExpenditureByMonthService ~ maxMonth:', maxMonth);

    if (minMonth === Infinity || maxMonth === Infinity) return [];

    let indexIncome = 0;
    let indexExpenditure = 0;

    const result = [];

    for (let month = minMonth; month <= maxMonth; month++) {
        const incomeAmount = income[indexIncome]?.income ?? 0;
        const expenditureAmount = expenditure[indexExpenditure]?.expenditure ?? 0;

        result.push({
            month,
            income: incomeAmount,
            expenditure: expenditureAmount,
        });

        if (Number(income[indexIncome]?.month) === month) indexIncome++;
        if (Number(expenditure[indexExpenditure]?.month) === month) indexExpenditure++;
    }

    return result;
};
