import { IGetRentalRequestRating, IGetRentalRequestRatingRes } from '../interfaces/dashboard';
import { IUserId } from '../interfaces/user';
import { getTenantDistributionByAreaForOwner } from '../repositories/contract.repository';
import {
    countCancelRequestByUserId,
    getContractCancellationRateByMonthForOwner,
} from '../repositories/contractCancellationRequest.repository';
import { countExtensionRequestByUserId } from '../repositories/contractExtensionRequest.repository';
import { countRentalRequestByUserId, getRentalRequestRating } from '../repositories/rentalRequest.repository';
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

export const getTenantDistributionByAreaForOwnerService = async (ownerId: IUserId) => {
    const result = await getTenantDistributionByAreaForOwner(ownerId);

    return result.map((item) => ({
        ...item,
        count: Number(item.count),
    }));
};

export const getContractCancellationRateByMonthForOwnerService = async (ownerId: IUserId) => {
    const year = new Date().getFullYear();

    const result = await getContractCancellationRateByMonthForOwner(ownerId, year);

    return result.map((item) => ({
        ...item,
        month: Number(item.month),
        year: Number(item.year),
        count: Number(item.count),
    }));
};

export const getRentalRequestRatingService = async (ownerId: IUserId) => {
    const year = new Date().getFullYear();

    const result = await getRentalRequestRating(ownerId, year);
    console.log('🚀 ~ getRentalRequestRatingService ~ result:', result);

    return result.reduce(
        (acc: Array<IGetRentalRequestRatingRes>, { count, status, ...cur }: IGetRentalRequestRating) => {
            const last = acc.at(-1);
            if (last && last.month === Number(cur.month) && last.year === Number(cur.year))
                return [
                    ...acc.slice(0, -1),
                    {
                        ...last,
                        [status]: Number(count),
                    },
                ];

            return [
                ...acc,
                {
                    ...cur,
                    APPROVED: 0,
                    PENDING: 0,
                    REJECTED: 0,
                    month: Number(cur.month),
                    year: Number(cur.year),
                    [status]: Number(count),
                },
            ];
        },
        [] as Array<IGetRentalRequestRatingRes>,
    );
};
