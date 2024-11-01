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
