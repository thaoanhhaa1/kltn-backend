import { NotificationType, Status } from '@prisma/client';
import { IUserId } from './user';

export interface ICreateNotification {
    title: string;
    body: string;
    from?: string;
    to: string;
    type: NotificationType;
}

export interface IUpdateNotificationStatus {
    notificationIds: Array<string>;
    status: Status;
    userId: IUserId;
}
