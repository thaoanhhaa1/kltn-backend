import { UserType } from './user';

export type NotificationType =
    | 'RENTER_RENTAL_REQUEST'
    | 'RENTAL_REQUEST'
    | 'PROPERTY'
    | 'REVIEW'
    | 'OWNER_PROPERTY'
    | 'OWNER_DETAIL_PROPERTY'
    | 'OWNER_CONTRACT'
    | 'RENTER_CONTRACT'
    | 'CONTRACT_DETAIL'
    | 'RENTER_PAYMENT';

export interface ICreateNotification {
    title: string;
    body: string;
    from?: string;
    to?: string;
    toRole?: UserType;
    type: NotificationType;
    docId?: string;
}
