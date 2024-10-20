import { Notification } from '@prisma/client';
import RabbitMQ from '../configs/rabbitmq.config';
import { INTERNAL_ESTATE_MANAGER_QUEUE } from '../constants/rabbitmq';
import {
    ICountNewNotificationsByUserId,
    ICreateNotification,
    IDeleteNotificationsByDocId,
    IGetNotificationsByUserId,
    IReadAllNotifications,
    IUpdateNotificationStatus,
} from '../interface/notification';
import { IPaginationResponse } from '../interface/pagination';
import {
    countNewNotificationsByUserId,
    countNotificationsByUserId,
    createNotification,
    deleteNotificationsByDocId,
    getNotificationsByUserId,
    readAll,
    updateNotificationStatus,
} from '../repositories/notification.repository';
import getPageInfo from '../utils/getPageInfo';

export const createNotificationService = async (params: ICreateNotification) => {
    const res = await createNotification(params);

    RabbitMQ.getInstance().sendToQueue(INTERNAL_ESTATE_MANAGER_QUEUE.name, {
        type: INTERNAL_ESTATE_MANAGER_QUEUE.type.CREATE_NOTIFICATION,
        data: res,
    });

    return res;
};

export const getNotificationsByUserIdService = async ({ pagination, userId, userTypes }: IGetNotificationsByUserId) => {
    const [notification, count] = await Promise.all([
        getNotificationsByUserId({ userId, pagination, userTypes }),
        countNotificationsByUserId({ userId, userTypes }),
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

export const countNewNotificationsByUserIdService = (params: ICountNewNotificationsByUserId) => {
    return countNewNotificationsByUserId(params);
};

export const updateNotificationStatusService = (params: IUpdateNotificationStatus) => {
    return updateNotificationStatus(params);
};

export const readAllNotificationsService = (params: IReadAllNotifications) => {
    return readAll(params);
};

export const deleteNotificationsByDocIdService = (params: IDeleteNotificationsByDocId) => {
    return deleteNotificationsByDocId(params);
};
