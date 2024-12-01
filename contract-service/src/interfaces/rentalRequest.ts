import { RentalRequestStatus } from '@prisma/client';
import { IUserId } from './user';

export interface IOwnerUpdateRentalRequestStatus {
    ownerId: IUserId;
    requestId: number;
    status: Extract<RentalRequestStatus, 'APPROVED' | 'REJECTED'>;
}

export interface IRenterUpdateRentalRequestStatus {
    renterId: IUserId;
    requestId: number;
    status: Extract<RentalRequestStatus, 'CANCELLED'>;
}

export interface IRentalRequest {
    requestId: number;
    renterId: string;
    ownerId: string;
    status: RentalRequestStatus;
    rentalPrice: number;
    rentalDeposit: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
    propertyId: string;
}

export interface IGenerateContract {
    requestId: number;
    renterId: string;
    ownerId: string;
    propertyId: string;
}

export interface IGetRentalRequestsByRenter {
    renterId: IUserId;
    skip: number;
    take: number;
    status?: RentalRequestStatus;
}

export interface IGetRentalRequestsByOwner {
    ownerId: IUserId;
    skip: number;
    take: number;
    propertyId?: string;
    rentalPrice?: number;
    rentalDeposit?: number;
    rentalStartDate?: Date | string;
    rentalEndDate?: Date | string;
    status?: RentalRequestStatus;
    renterId?: string;
}
