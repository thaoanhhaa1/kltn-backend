import { NotificationType } from '@prisma/client';

export interface ICreateNotification {
    title: string;
    body: string;
    from?: string;
    to: string;
    type: NotificationType;
}
