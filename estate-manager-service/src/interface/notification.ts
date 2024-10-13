import { NotificationType, Status, UserType } from '@prisma/client';
import { IUserId } from './user';
import { IPagination } from './pagination';

export interface ICreateNotification {
    title: string;
    body: string;
    from?: string;
    to?: string;
    toRole?: UserType;
    type: NotificationType;
    docId?: string;
}

export interface IUpdateNotificationStatus {
    notificationIds: Array<string>;
    status: Status;
    userId: IUserId;
    userTypes: UserType[];
}

export interface IGetNotificationsByUserId {
    userId: IUserId;
    pagination: IPagination;
    userTypes: UserType[];
}

export interface ICountNewNotificationsByUserId {
    userId: IUserId;
    userTypes: UserType[];
}

export interface IReadAllNotifications {
    userId: IUserId;
    userTypes: UserType[];
}

export interface IDeleteNotificationsByDocId {
    userId: IUserId;
    userTypes: UserType[];
    docId: string;
}
