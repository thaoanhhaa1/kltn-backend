import { Status } from '@prisma/client';
import { IGetRentalRequestRating, IGetRentalRequestRatingRes } from '../interfaces/dashboard';
import { IUserId } from '../interfaces/user';
import { countContractByStatus, getTenantDistributionByAreaForOwner } from '../repositories/contract.repository';
import {
    countCancelRequestByUserId,
    getContractCancellationRateByMonthForOwner,
} from '../repositories/contractCancellationRequest.repository';
import { countExtensionRequestByUserId } from '../repositories/contractExtensionRequest.repository';
import {
    countRentalRequestByDay,
    countRentalRequestByMonth,
    countRentalRequestByStatus,
    countRentalRequestByUserId,
    countRentalRequestByWeek,
    getRentalRequestRating,
} from '../repositories/rentalRequest.repository';
import {
    calcAvgRevenueByMonth,
    countTransactionsByMonthAndStatus,
    countTransactionsByStatus,
    getExpenditureTransactionsByMonth,
    getIncomeTransactionsByMonth,
    getRevenueAndFeeByMonth,
    getTransactionStats,
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

export const getOverviewByAdminService = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const [rentalRequestByStatus, contractByStatus, transactionsStats] = await Promise.all([
        countRentalRequestByStatus(year, month),
        countContractByStatus(),
        getTransactionStats(),
    ]);

    const getContractStatus = (status: Status): Status => {
        switch (status) {
            case 'WAITING':
                return 'WAITING';
            case 'DEPOSITED':
            case 'ONGOING':
            case 'PENDING_CANCELLATION':
            case 'UNILATERAL_CANCELLATION':
            case 'APPROVED_CANCELLATION':
            case 'REJECTED_CANCELLATION':
                return 'ONGOING';
            default:
                return 'ENDED';
        }
    };

    const transactionStats = transactionsStats[0];

    return {
        rentalRequestByStatus: rentalRequestByStatus.reduce(
            (acc, { status, count }) => ({
                ...acc,
                [status]: Number(count),
            }),
            {},
        ),
        contractByStatus: contractByStatus.reduce((acc, { status, _count }) => {
            const contractStatus = getContractStatus(status);
            return {
                ...acc,
                [contractStatus]: (acc[contractStatus] || 0) + Number(_count.status),
            };
        }, {} as Record<Status, number>),
        transactionStats: {
            count: Number(transactionStats.total_transactions),
            revenue: Number(transactionStats.total_revenue),
            fee: Number(transactionStats.total_fee),
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

export const countRentalRequestByDayService = async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const result = await countRentalRequestByDay(year, month);

    return result.map((item) => ({
        day: Number(item.day),
        count: Number(item.count),
    }));
};

export const countRentalRequestByWeekService = async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const result = await countRentalRequestByWeek(year, month);

    return result.map((item) => ({
        week: Number(item.week),
        count: Number(item.count),
    }));
};

export const countRentalRequestByMonthService = async () => {
    const year = new Date().getFullYear();

    const result = await countRentalRequestByMonth(year);

    return result.map((item) => ({
        month: Number(item.month),
        count: Number(item.count),
    }));
};

export const countTransactionsByStatusService = async () => {
    const result = await countTransactionsByStatus();

    return result.map(({ total_transactions, ...item }) => ({
        ...item,
        totalTransactions: Number(total_transactions),
    }));
};

export const getRevenueAndFeeByMonthService = async () => {
    const year = new Date().getFullYear();

    const result = await getRevenueAndFeeByMonth(year);

    return result;
};

export const countTransactionsByMonthAndStatusService = async () => {
    const year = new Date().getFullYear();

    const result = await countTransactionsByMonthAndStatus(year);

    return result.reduce((pre, cur) => {
        const last = pre.at(-1);

        if (!last || last.month !== Number(cur.month))
            return [
                ...pre,
                {
                    month: Number(cur.month),
                    [cur.status]: Number(cur.total_transactions),
                },
            ];

        return [
            ...pre.slice(0, -1),
            {
                ...last,
                [cur.status]: Number(cur.total_transactions),
            },
        ];
    }, [] as any);
};
