import { RentalRequestStatus } from '@prisma/client';
import { IUserId } from './user';

export interface IOwnerUpdateRentalRequestStatus {
    ownerId: IUserId;
    slug: string;
    status: Extract<RentalRequestStatus, 'APPROVED' | 'REJECTED'>;
}

export interface IRenterUpdateRentalRequestStatus {
    renterId: IUserId;
    slug: string;
    status: Extract<RentalRequestStatus, 'CANCELLED'>;
}
