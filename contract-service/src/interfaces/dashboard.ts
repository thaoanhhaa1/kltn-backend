import { RentalRequestStatus } from '@prisma/client';

export interface IGetContractCancellationRateByMonthForOwner {
    month: number;
    year: number;
    count: number;
}

export interface IGetRentalRequestRating {
    month: number;
    year: number;
    status: RentalRequestStatus;
    count: number;
}

export interface IGetRentalRequestRatingRes {
    month: number;
    year: number;
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
}

export interface IGetTenantDistributionByAreaForOwner {
    city: string;
    district: string;
    count: number;
}

export interface ICountRentalRequestByStatus {
    status: RentalRequestStatus;
    count: number;
}

export interface ITransactionStats {
    total_transactions: number;
    total_revenue: number;
    total_fee: number;
}

export interface ICountRentalRequestByDay {
    day: number;
    count: number;
}

export interface ICountRentalRequestByWeek {
    week: number;
    count: number;
}

export interface ICountRentalRequestByMonth {
    month: number;
    count: number;
}
