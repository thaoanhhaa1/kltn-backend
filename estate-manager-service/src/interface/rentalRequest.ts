import { RentalRequestStatus } from '@prisma/client';
import { IUserId } from './user';

export interface IOwnerUpdateRentalRequestStatus {
    ownerId: IUserId;
    requestId: string;
    status: Extract<RentalRequestStatus, 'APPROVED' | 'REJECTED'>;
}

export interface IRenterUpdateRentalRequestStatus {
    renterId: IUserId;
    requestId: string;
    status: Extract<RentalRequestStatus, 'CANCELLED'>;
}

export interface IRentalRequest {
    requestId: string;
    renterId: string;
    ownerId: string;
    status: RentalRequestStatus;
    rentalPrice: number;
    rentalDeposit: number;
    rentalStartDate: Date;
    rentalEndDate: Date;
    createdAt: Date;
    updatedAt: Date;
    property: {
        propertyId: string;
        title: string;
        images: string[];
        slug: string;
    };
}

export interface IGenerateContract {
    requestId: string;
    renterId: string;
    ownerId: string;
    propertyId: string;
}
