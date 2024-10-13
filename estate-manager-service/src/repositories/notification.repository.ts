import {
    ICountNewNotificationsByUserId,
    ICreateNotification,
    IDeleteNotificationsByDocId,
    IGetNotificationsByUserId,
    IReadAllNotifications,
    IUpdateNotificationStatus,
} from '../interface/notification';
import prisma from '../prisma/prismaClient';

export const createNotification = (params: ICreateNotification) => {
    return prisma.notification.create({
        data: params,
    });
};

export const getNotificationsByUserId = ({ pagination, userId, userTypes }: IGetNotificationsByUserId) => {
    return prisma.notification.findMany({
        where: {
            OR: [
                {
                    to: userId,
                },
                {
                    toRole: {
                        in: userTypes,
                    },
                },
            ],
            status: {
                not: 'DELETED',
            },
        },
        take: pagination.take,
        skip: pagination.skip,
        orderBy: {
            createdAt: 'desc',
        },
    });
};

export const countNewNotificationsByUserId = ({ userId, userTypes }: ICountNewNotificationsByUserId) => {
    return prisma.notification.count({
        where: {
            OR: [
                {
                    to: userId,
                },
                {
                    toRole: {
                        in: userTypes,
                    },
                },
            ],
            status: 'RECEIVED',
        },
    });
};

export const countNotificationsByUserId = ({ userId, userTypes }: ICountNewNotificationsByUserId) => {
    return prisma.notification.count({
        where: {
            OR: [
                {
                    to: userId,
                },
                {
                    toRole: {
                        in: userTypes,
                    },
                },
            ],
            status: {
                not: 'DELETED',
            },
        },
    });
};

export const updateNotificationStatus = ({ notificationIds, status, userId, userTypes }: IUpdateNotificationStatus) => {
    return prisma.notification.updateMany({
        where: {
            id: {
                in: notificationIds,
            },
            OR: [
                {
                    to: userId,
                },
                {
                    toRole: {
                        in: userTypes,
                    },
                },
            ],
        },
        data: {
            status,
        },
    });
};

export const readAll = ({ userId, userTypes }: IReadAllNotifications) => {
    return prisma.notification.updateMany({
        where: {
            OR: [
                {
                    to: userId,
                },
                {
                    toRole: {
                        in: userTypes,
                    },
                },
            ],
            status: 'RECEIVED',
        },
        data: {
            status: 'READ',
        },
    });
};

export const deleteNotificationsByDocId = ({ docId }: IDeleteNotificationsByDocId) => {
    return prisma.notification.updateMany({
        where: {
            docId,
        },
        data: {
            status: 'DELETED',
        },
    });
};
