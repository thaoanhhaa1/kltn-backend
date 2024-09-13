import { Notification } from '@prisma/client';
import { ICreateNotification } from '../interface/notification';
import { IPagination, IPaginationResponse } from '../interface/pagination';
import { IUserId } from '../interface/user';
import {
    countNewNotificationsByUserId,
    countNotificationsByUserId,
    createNotification,
    getNotificationsByUserId,
} from '../repositories/notification.repository';
import getPageInfo from '../utils/getPageInfo';

export const createNotificationService = (params: ICreateNotification) => {
    return createNotification(params);
};

export const getNotificationsByUserIdService = async (userId: IUserId, pagination: IPagination) => {
    const [notification, count] = await Promise.all([
        getNotificationsByUserId(userId, pagination),
        countNotificationsByUserId(userId),
    ]);

    const res: IPaginationResponse<Notification> = {
        data: notification,
        pageInfo: getPageInfo({
            count,
            skip: pagination.skip,
            take: pagination.take,
        }),
    };

    return res;
};

export const countNewNotificationsByUserIdService = (userId: IUserId) => {
    return countNewNotificationsByUserId(userId);
};
